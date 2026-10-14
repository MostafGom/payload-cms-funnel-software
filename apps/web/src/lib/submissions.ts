import { sql as dsql } from '@payloadcms/db-postgres'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
} from 'payload'
import { extractAttribution } from '@fp/attribution'
import {
  OutboxTopics,
  SubmissionRequest,
  type FormSnapshot,
  type SubmissionResponse,
} from '@fp/contracts'
import { encodeConsent, type EnrichedEvent } from '@fp/event-schemas'
import {
  checkSpam,
  decideDedupe,
  mapToContact,
  validateSubmission,
  type ContactPatch,
} from '@fp/forms'
import { encryptSecret, truncateIp } from '@fp/platform/crypto'
import { uuidv7 } from '@fp/platform/ids'
import type { Logger } from '@fp/platform/logger'
import { currentTraceparent } from '@fp/platform/otel'
import { keyring, redis } from './cdp'
import { serverEnv } from './env'
import { loadFormSnapshotFresh } from './forms'
import { appendOutbox, txExecute, type OutboxWrite } from './payload-tx'
import { clientIp, consentForRequest } from './request-context'

type HeaderBag = { get(name: string): string | null }
export type SubmitResult =
  | { status: 200; body: SubmissionResponse }
  | {
      status: 400 | 403 | 404 | 422 | 429 | 503
      body: { error: string; errors?: Record<string, string> }
    }

const LIFECYCLE_ORDER = [
  'subscriber',
  'lead',
  'marketing_qualified',
  'sales_qualified',
  'opportunity',
  'customer',
  'evangelist',
]
const PLATFORM_COOKIES = ['_fbp', '_fbc', '_ttp', '_scid'] as const

/**
 * Form submission pipeline (FR-FRM-3..8, ADR-0006). Validation and spam checks run before any
 * write; the contact upsert, submission, identity link and outbox rows commit in ONE transaction.
 * Side effects (CAPI, webhooks, email) happen later from the outbox, never inline.
 */
export async function submitForm(input: {
  payload: Payload
  logger: Logger
  formId: string
  raw: unknown
  headers: HeaderBag
  cookies: Map<string, string>
  now?: Date
}): Promise<SubmitResult> {
  const now = input.now ?? new Date()
  const env = serverEnv()
  const parsed = SubmissionRequest.safeParse(input.raw)
  if (!parsed.success) return { status: 400, body: { error: 'invalid_request' } }
  const { values: rawValues, meta } = parsed.data

  if (!sameOrigin(input.headers)) return { status: 403, body: { error: 'bad_origin' } }

  const ip = clientIp(input.headers)
  if (!(await withinRateLimit(ip ?? 'unknown', env.FORM_RATE_LIMIT_PER_MIN)))
    return { status: 429, body: { error: 'rate_limited' } }

  const form = await loadFormSnapshotFresh(input.formId)
  if (!form) return { status: 404, body: { error: 'form_not_found' } }

  const consent = await consentForRequest(input.headers, meta.consent)
  const geoCountry = consent.region.startsWith('XX') ? null : consent.region.slice(0, 2)
  const validated = validateSubmission(form, rawValues, { geoCountry })
  if (!validated.ok)
    return { status: 422, body: { error: 'validation_failed', errors: validated.errors } }
  const contactPatch = mapToContact(form, validated.values, { geoCountry })

  const spam = checkSpam({
    honeypot: meta.hp,
    startedAt: meta.startedAt,
    now: now.getTime(),
    minSeconds: form.spam.minSeconds,
    email: contactPatch.email,
    blockDisposable: form.spam.blockDisposable,
  })
  const turnstileOk = !form.spam.turnstile || (await verifyTurnstile(meta.turnstileToken, ip))
  const submissionId = uuidv7()
  const next = nextAction(form)
  if (!spam.ok || !turnstileOk) {
    // Bots get a normal-looking success; nothing downstream fires (FR-FRM-5).
    input.logger.info(
      { formId: form.id, reason: spam.ok ? 'turnstile' : spam.reason },
      'submission rejected as spam',
    )
    await recordSpam(input.payload, form, meta.eventId, spam.ok ? 'turnstile' : spam.reason).catch(
      () => {},
    )
    return { status: 200, body: { ok: true, submissionId, eventId: meta.eventId, next } }
  }

  // Attribution snapshot (FR-FRM-3): every URL param, first/last touch, referrer, device, geo.
  const current = extractAttribution(meta.pageUrl)
  const first = meta.firstTouch
    ? { ...meta.firstTouch, ...extractAttribution(meta.firstTouch.url) }
    : null
  const last = meta.lastTouch
    ? { ...meta.lastTouch, ...extractAttribution(meta.lastTouch.url) }
    : null
  const userAgent = input.headers.get('user-agent')?.slice(0, 512) ?? null
  const attribution = {
    urlParams: current.params,
    utm: current.utm,
    clickIds: current.clickIds,
    pageUrl: meta.pageUrl,
    referrer: meta.referrer ?? null,
    landingPage: first?.url ?? meta.pageUrl,
    firstTouch: first,
    lastTouch: last ?? {
      url: meta.pageUrl,
      referrer: meta.referrer,
      at: now.toISOString(),
      ...current,
    },
    device: { userAgent, locale: meta.locale ?? null, tz: meta.tz ?? null },
    geo: { region: consent.region },
  }
  const cookies = Object.fromEntries(
    PLATFORM_COOKIES.flatMap((k) => (input.cookies.get(k) ? [[k, input.cookies.get(k)!]] : [])),
  )
  if (!cookies._fbc && current.clickIds.fbclid && consent.marketing)
    cookies._fbc = `fb.1.${now.getTime()}.${current.clickIds.fbclid}`
  const anonymousId = consent.analytics
    ? (input.cookies.get('_cm_aid') ?? meta.anonymousId ?? null)
    : null

  const req = await createLocalReq({ context: { actor: 'form' } }, input.payload)
  const shouldCommit = await initTransaction(req)
  try {
    const { contactId, created, possibleDuplicateOf } = await upsertContact(
      req,
      form,
      contactPatch,
      attribution,
      consent,
      now,
    )

    await input.payload.create({
      collection: 'form-submissions',
      req,
      overrideAccess: true,
      data: {
        form: form.id,
        formVersion: form.version,
        contact: contactId,
        status: 'accepted',
        eventId: meta.eventId,
        anonymousId,
        sessionId: meta.sessionId,
        data: validated.values,
        attribution,
        utmSource: current.utm.utm_source ?? first?.utm.utm_source ?? null,
        utmCampaign: current.utm.utm_campaign ?? first?.utm.utm_campaign ?? null,
        funnel: meta.funnel?.funnelId ?? null,
        stepId: meta.funnel?.stepId ?? null,
        variantKey: meta.funnel?.variantKey ?? null,
        pageUrl: meta.pageUrl,
        geoCountry: consent.region.slice(0, 2),
        consent: {
          analytics: consent.analytics,
          marketing: consent.marketing,
          regime: consent.regime,
          gpc: consent.gpc,
        },
      },
    })

    if (possibleDuplicateOf) {
      const [a, b] = [contactId, possibleDuplicateOf].sort()
      await txExecute(
        req,
        dsql`INSERT INTO cdp.duplicate_candidates (contact_a, contact_b, reason, score)
        VALUES (${a}, ${b}, 'same_phone_different_email', 0.8) ON CONFLICT DO NOTHING`,
      )
    }
    if (anonymousId) {
      await txExecute(
        req,
        dsql`INSERT INTO cdp.identity_links (anonymous_id, contact_id, source)
        VALUES (${anonymousId}, ${contactId}, 'form') ON CONFLICT DO NOTHING`,
      )
    }
    const identifiers = [
      ...Object.entries(cookies).map(([k, v]) => ({ kind: k.slice(1), value: v })),
      ...Object.entries(current.clickIds).map(([k, v]) => ({ kind: `click:${k}`, value: v })),
    ]
    for (const i of identifiers) {
      await txExecute(
        req,
        dsql`INSERT INTO cdp.contact_identifiers (contact_id, kind, value)
        VALUES (${contactId}, ${i.kind}, ${i.value.slice(0, 512)})
        ON CONFLICT (contact_id, kind, value) DO UPDATE SET last_seen = now()`,
      )
    }
    if (meta.consent?.d) {
      await txExecute(
        req,
        dsql`INSERT INTO cdp.consent_records (id, recorded_at, anonymous_id, contact_id, session_id, region, regime,
          analytics, marketing, gpc, source, ip_trunc, user_agent)
        VALUES (${uuidv7()}, ${now.toISOString()}, ${anonymousId}, ${contactId}, ${meta.sessionId}, ${consent.region}, ${consent.regime},
          ${consent.analytics}, ${consent.marketing}, ${consent.gpc}, 'form', ${truncateIp(ip)}::inet, ${userAgent})`,
      )
    }

    // Server-side conversion event: same event_id as the browser pixel (FR-DST-4).
    const serverEvent: EnrichedEvent = {
      event_id: meta.eventId,
      name: 'form_submitted',
      schema_v: 1,
      occurred_at: now.toISOString(),
      occurred_at_corrected: now.toISOString(),
      received_at: now.toISOString(),
      session_id: meta.sessionId,
      anonymous_id: anonymousId ?? undefined,
      contact_id: contactId,
      sdk_v: 'server',
      page: { url: meta.pageUrl, path: new URL(meta.pageUrl).pathname, referrer: meta.referrer },
      context: {
        locale: meta.locale,
        tz: meta.tz,
        consent: { a: consent.analytics, m: consent.marketing },
      },
      funnel: meta.funnel
        ? {
            funnel_id: meta.funnel.funnelId,
            step_id: meta.funnel.stepId,
            variant_key: meta.funnel.variantKey,
            experiment_id: meta.funnel.experimentId,
          }
        : undefined,
      properties: { form_id: form.id, submission_id: submissionId, created_contact: created },
      workspace_id: 1,
      source: 'server',
      ip: null,
      ip_enc: ip ? encryptSecret(ip, keyring()) : undefined,
      ip_trunc: truncateIp(ip),
      user_agent: userAgent,
      device: { type: null, os: null, browser: null },
      geo: {
        country: consent.region.slice(0, 2).toLowerCase(),
        region: consent.region.includes('-') ? consent.region.slice(3) : null,
        city: null,
      },
      is_bot: false,
      consent_mask: encodeConsent({ analytics: consent.analytics, marketing: consent.marketing }),
      cookies,
      region: consent.region,
      regime: consent.regime,
      gpc: consent.gpc,
      traceparent: currentTraceparent(),
    }
    const outbox: OutboxWrite[] = [
      {
        topic: OutboxTopics.serverEvent,
        key: meta.eventId,
        payload: serverEvent as unknown as Record<string, unknown>,
      },
    ]
    if (anonymousId)
      outbox.push({
        topic: OutboxTopics.identityLinked,
        key: contactId,
        payload: { anonymousId, contactId, source: 'form' },
      })
    if (form.actions.doubleOptIn && contactPatch.consents.email_marketing && contactPatch.email) {
      outbox.push({
        topic: OutboxTopics.emailSend,
        key: contactId,
        payload: {
          kind: 'double_opt_in',
          contactId,
          templateId: form.actions.confirmationTemplateId,
          vars: {},
        },
      })
    } else if (form.actions.confirmationTemplateId && contactPatch.email) {
      outbox.push({
        topic: OutboxTopics.emailSend,
        key: contactId,
        payload: {
          kind: 'transactional',
          contactId,
          templateId: form.actions.confirmationTemplateId,
          vars: {},
        },
      })
    }
    outbox.push({
      topic: OutboxTopics.sequenceTrigger,
      key: contactId,
      payload: { contactId, trigger: { type: 'form_submitted', formId: form.id } },
    })
    for (const sequenceId of form.actions.sequenceIds)
      outbox.push({
        topic: OutboxTopics.sequenceTrigger,
        key: contactId,
        payload: { contactId, trigger: { type: 'manual', sequenceId } },
      })
    await appendOutbox(req, outbox)

    if (shouldCommit) await commitTransaction(req)
    input.logger.info(
      { formId: form.id, submissionId, contactId, created },
      'form submission accepted',
    )
  } catch (err) {
    await killTransaction(req)
    if (isUniqueViolation(err, 'event_id')) {
      // Double submit (retry, double click): idempotent on the browser event id.
      return { status: 200, body: { ok: true, submissionId, eventId: meta.eventId, next } }
    }
    input.logger.error({ err, formId: form.id }, 'form submission failed')
    return { status: 503, body: { error: 'unavailable' } }
  }
  return { status: 200, body: { ok: true, submissionId, eventId: meta.eventId, next } }
}

type Req = Awaited<ReturnType<typeof createLocalReq>>

async function upsertContact(
  req: Req,
  form: FormSnapshot,
  p: ContactPatch,
  attribution: Record<string, unknown> & {
    utm: Record<string, string>
    clickIds: Record<string, string>
  },
  consent: { analytics: boolean; marketing: boolean; regime: string; region: string },
  now: Date,
): Promise<{ contactId: string; created: boolean; possibleDuplicateOf?: string }> {
  const { payload } = req
  const find = async (field: 'email' | 'phone', value: string | null) =>
    value
      ? ((
          await payload.find({
            collection: 'contacts',
            where: { [field]: { equals: value }, status: { equals: 'active' } },
            limit: 1,
            depth: 0,
            req,
            overrideAccess: true,
          })
        ).docs[0] ?? null)
      : null
  const byEmail = await find('email', p.email)
  const byPhone = byEmail ? null : await find('phone', p.phone)
  const decision = decideDedupe({
    email: p.email,
    byEmail: byEmail ? { id: String(byEmail.id), email: byEmail.email ?? null } : null,
    byPhone: byPhone ? { id: String(byPhone.id), email: byPhone.email ?? null } : null,
  })

  const optIn = p.consents.email_marketing === true
  const consentSnapshot = {
    analytics: consent.analytics,
    marketing: consent.marketing,
    regime: consent.regime,
    region: consent.region,
    at: now.toISOString(),
  }
  const lastTouch = attribution.lastTouch as Record<string, unknown>

  if (decision.action === 'update') {
    const existing = (byEmail ?? byPhone)!
    const tags = [
      ...new Set([
        ...(existing.tags ?? []).map((t) => (typeof t === 'object' ? t.id : t)),
        ...form.actions.tagIds,
      ]),
    ]
    const lists = [
      ...new Set([
        ...(existing.lists ?? []).map((l) => (typeof l === 'object' ? l.id : l)),
        ...form.actions.listIds,
      ]),
    ]
    const stage = upgradeStage(existing.lifecycleStage ?? null, form.actions.lifecycleStage)
    const marketingStatus =
      optIn && existing.marketingStatus !== 'subscribed'
        ? form.actions.doubleOptIn
          ? 'unconfirmed'
          : 'subscribed'
        : existing.marketingStatus
    await payload.update({
      collection: 'contacts',
      id: existing.id,
      req,
      overrideAccess: true,
      data: {
        email: existing.email ?? p.email,
        phone: existing.phone ?? p.phone,
        firstName: p.firstName ?? existing.firstName,
        lastName: p.lastName ?? existing.lastName,
        country: existing.country ?? p.country,
        customFields: { ...((existing.customFields as object) ?? {}), ...p.customFields },
        tags,
        lists,
        lifecycleStage: stage as never,
        marketingStatus,
        lastTouch,
        consent: consentSnapshot,
      },
    })
    return { contactId: String(existing.id), created: false }
  }

  const doc = await payload.create({
    collection: 'contacts',
    req,
    overrideAccess: true,
    data: {
      email: p.email,
      phone: p.phone,
      firstName: p.firstName,
      lastName: p.lastName,
      country: p.country,
      customFields: p.customFields,
      tags: form.actions.tagIds,
      lists: form.actions.listIds,
      lifecycleStage: (form.actions.lifecycleStage ?? 'lead') as never,
      marketingStatus: optIn ? (form.actions.doubleOptIn ? 'unconfirmed' : 'subscribed') : 'none',
      acquisition: {
        utmSource: attribution.utm.utm_source ?? null,
        utmMedium: attribution.utm.utm_medium ?? null,
        utmCampaign: attribution.utm.utm_campaign ?? null,
        clickIdType: Object.keys(attribution.clickIds)[0] ?? null,
        landingPage: String(attribution.landingPage ?? ''),
        referrer: (attribution.referrer as string | null) ?? null,
        form: form.id,
      },
      firstTouch: (attribution.firstTouch as Record<string, unknown> | null) ?? lastTouch,
      lastTouch,
      consent: consentSnapshot,
    },
  })
  return {
    contactId: String(doc.id),
    created: true,
    possibleDuplicateOf: decision.possibleDuplicateOf,
  }
}

const upgradeStage = (current: string | null, next: string | undefined): string | null => {
  if (!next) return current
  if (!current) return next
  return LIFECYCLE_ORDER.indexOf(next) > LIFECYCLE_ORDER.indexOf(current) ? next : current
}

function nextAction(form: FormSnapshot): SubmissionResponse['next'] {
  if (form.onSuccess.type === 'redirect' && form.onSuccess.redirectUrl)
    return { type: 'redirect', url: form.onSuccess.redirectUrl }
  return { type: 'message', message: form.onSuccess.message ?? 'Thanks! You are signed up.' }
}

/** Browsers always send Origin on fetch POST; it must match the host the form was served on. */
function sameOrigin(h: HeaderBag): boolean {
  const origin = h.get('origin')
  if (!origin) return false
  const host = (h.get('x-forwarded-host') ?? h.get('host'))?.split(',')[0]?.trim()
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

async function withinRateLimit(ip: string, perMinute: number): Promise<boolean> {
  try {
    const key = `rl:form:${ip}:${Math.floor(Date.now() / 60_000)}`
    const [[, n]] = (await redis().multi().incr(key).expire(key, 120).exec()) as [
      [null, number],
      unknown,
    ]
    return n <= perMinute
  } catch {
    return true // fail open: Valkey down must not block sign-ups (spam checks still apply)
  }
}

async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) })
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(3000),
    })
    return ((await res.json()) as { success?: boolean }).success === true
  } catch {
    return false
  }
}

async function recordSpam(payload: Payload, form: FormSnapshot, eventId: string, reason: string) {
  await payload.create({
    collection: 'form-submissions',
    overrideAccess: true,
    data: { form: form.id, formVersion: form.version, status: 'spam', spamReason: reason, eventId },
  })
}

function isUniqueViolation(err: unknown, needle: string): boolean {
  for (
    let e = err as { code?: string; message?: string; cause?: unknown } | undefined;
    e;
    e = e.cause as typeof e
  ) {
    if (e.code === '23505' && (e.message ?? '').includes(needle)) return true
    if ((e.message ?? '').includes('unique') && (e.message ?? '').includes(needle)) return true
  }
  return false
}
