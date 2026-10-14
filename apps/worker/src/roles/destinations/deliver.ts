import { resolveConsent, type Regime } from '@fp/consent'
import type { DestinationSnapshot } from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { metaCapi } from '@fp/dest-meta-capi'
import { snapCapi } from '@fp/dest-snap-capi'
import { tiktokEvents } from '@fp/dest-tiktok-events'
import { webhook } from '@fp/dest-webhook'
import { nextRetryDelay, type DestinationAdapter } from '@fp/destinations-sdk'
import { hasConsent } from '@fp/event-schemas'
import { decryptSecret, type Keyring } from '@fp/platform/crypto'
import { assertPublicUrl } from '@fp/platform/http'
import type { Logger } from '@fp/platform/logger'
import type { DeliveryJob } from '../../lib/queues.ts'
import type { SnapshotCache } from '../../lib/snapshots.ts'

/** Adapter registry (plan §6). New platform: add the package and one line here. */
export const ADAPTERS: Record<DestinationSnapshot['type'], DestinationAdapter> = {
  meta: metaCapi,
  tiktok: tiktokEvents,
  snap: snapCapi,
  webhook,
}

export type DeliveryOutcome =
  | { status: 'success'; latencyMs: number }
  | { status: 'retry'; delayMs: number; reason: string }
  | { status: 'failed' | 'dead' | 'skipped_consent' | 'skipped_config'; reason: string }
  | { status: 'noop' }

export interface DeliverDeps {
  sql: Sql
  snapshots: SnapshotCache
  keyring: Keyring
  logger: Logger
  baseUrls: Partial<Record<DestinationSnapshot['type'], string>>
  allowPrivateWebhooks: boolean
  fetch?: typeof fetch
  now?: () => number
}

/**
 * One delivery attempt (ADR-0010). Loads the stored event and contact, re-checks consent, maps
 * with the adapter, sends, classifies, and records the outcome in the delivery log.
 * Idempotent: a delivery already in a terminal state is a no-op.
 */
export async function deliver(
  deps: DeliverDeps,
  job: DeliveryJob,
  attempt: number,
): Promise<DeliveryOutcome> {
  const now = deps.now ?? Date.now
  const key = { deliveryId: job.deliveryId, createdAt: job.createdAt }
  const [delivery] = await deps.sql<
    { status: string; platform_event: string | null; test_mode: boolean }[]
  >`
    SELECT status, platform_event, test_mode FROM cdp.destination_deliveries
    WHERE delivery_id = ${job.deliveryId} AND created_at = ${job.createdAt}`
  if (
    !delivery ||
    ['success', 'dead', 'skipped_consent', 'skipped_config', 'skipped_filter'].includes(
      delivery.status,
    )
  )
    return { status: 'noop' }

  const dest = await deps.snapshots.get('destination', job.destinationId)
  const finish = async (
    o: DeliveryOutcome,
    extra: Parameters<typeof repos.updateDelivery>[2] extends infer U ? Partial<U> : never = {},
  ) => {
    const status = o.status === 'retry' ? 'retrying' : o.status === 'noop' ? undefined : o.status
    if (status)
      await repos.updateDelivery(deps.sql, key, {
        status,
        attempts: attempt,
        error: 'reason' in o ? o.reason : null,
        latencyMs: o.status === 'success' ? o.latencyMs : null,
        ...extra,
      })
    return o
  }
  if (!dest || !dest.enabled)
    return finish({ status: 'skipped_config', reason: 'destination_disabled' })
  const adapter = ADAPTERS[dest.type]

  const [ev] = await deps.sql<
    {
      event_id: string
      name: string
      occurred_at: string
      received_at: string
      page_url: string | null
      referrer: string | null
      source: 'browser' | 'server'
      properties: Record<string, unknown>
      click_ids: Record<string, string> | null
      utm_source: string | null
      utm_medium: string | null
      utm_campaign: string | null
      geo_country: string | null
      geo_region: string | null
      anonymous_id: string | null
      session_id: string
      contact_id: string | null
      consent: number
      context: { regime?: Regime; region?: string; gpc?: boolean } | null
    }[]
  >`SELECT event_id, name, occurred_at, received_at, page_url, referrer, source, properties, click_ids,
        utm_source, utm_medium, utm_campaign, geo_country, geo_region, anonymous_id, session_id, contact_id,
        consent, context
    FROM cdp.events WHERE event_id = ${job.eventId} AND received_at = ${job.createdAt}`
  if (!ev) return finish({ status: 'failed', reason: 'event_not_found' })

  // Consent is re-evaluated at send time: a later opt-out wins (FR-DST-6, FR-CNS-3).
  const regime = ev.context?.regime ?? 'opt_in'
  const latest =
    ev.contact_id || ev.anonymous_id
      ? await repos.latestConsent(deps.sql, {
          contactId: ev.contact_id,
          anonymousId: ev.anonymous_id,
        })
      : null
  const marketingNow =
    latest && new Date(latest.recorded_at) > new Date(ev.occurred_at)
      ? latest.marketing && hasConsent(ev.consent, 'marketing')
      : hasConsent(ev.consent, 'marketing')
  const consent = resolveConsent({
    regime,
    choice: { analytics: hasConsent(ev.consent, 'analytics'), marketing: marketingNow },
    gpc: ev.context?.gpc,
  })
  let limitedDataUse = false
  if (dest.type !== 'webhook' && !consent.marketing) {
    if (regime !== 'opt_in' && adapter.supportsLimitedDataUse && dest.limitedDataUse)
      limitedDataUse = true
    else return finish({ status: 'skipped_consent', reason: 'no_marketing_consent' })
  }

  let credentials: Record<string, string> = {}
  try {
    credentials = dest.credentials
      ? (JSON.parse(decryptSecret(dest.credentials, deps.keyring)) as Record<string, string>)
      : {}
  } catch {
    return finish({ status: 'failed', reason: 'credentials_undecryptable' })
  }
  if (adapter.requiredCredentials.some((k) => !credentials[k]))
    return finish({ status: 'skipped_config', reason: 'missing_credentials' })

  const contact = ev.contact_id ? await repos.getContact(deps.sql, ev.contact_id) : null
  const identifiers = ev.contact_id ? await repos.latestIdentifiers(deps.sql, ev.contact_id) : {}
  const cookies = Object.fromEntries(
    Object.entries(job.cookies ?? {}).map(([k, v]) => [k.replace(/^_/, ''), v]),
  )
  const prepared = adapter.prepare({
    event: {
      eventId: ev.event_id,
      name: ev.name,
      platformEvent: delivery.platform_event ?? ev.name,
      occurredAt: new Date(ev.occurred_at).toISOString(),
      pageUrl: ev.page_url,
      referrer: ev.referrer,
      source: ev.source,
      properties: ev.properties ?? {},
      clickIds: ev.click_ids ?? {},
      utm: { utm_source: ev.utm_source, utm_medium: ev.utm_medium, utm_campaign: ev.utm_campaign },
      ip: job.ipEnc ? safeDecrypt(job.ipEnc, deps.keyring) : null,
      userAgent: job.userAgent ?? null,
      geoCountry: ev.geo_country,
      geoRegion: ev.geo_region,
      anonymousId: ev.anonymous_id,
      sessionId: ev.session_id,
    },
    user: {
      contactId: contact?.id ?? null,
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      firstName: contact?.first_name ?? null,
      lastName: contact?.last_name ?? null,
      city: contact?.city ?? null,
      country: contact?.country ?? ev.geo_country,
      identifiers: { ...identifiers, ...cookies },
    },
    destination: dest,
    credentials,
    testMode: delivery.test_mode || dest.testMode,
    limitedDataUse,
    region: ev.context?.region ?? null,
    baseUrl: deps.baseUrls[dest.type],
  })

  if (dest.type === 'webhook') {
    try {
      await assertPublicUrl(prepared.url, { allowPrivate: deps.allowPrivateWebhooks })
    } catch (err) {
      return finish(
        { status: 'failed', reason: `unsafe_url: ${(err as Error).message}` },
        { requestSummary: prepared.summary },
      )
    }
  }

  const started = now()
  let status = 0
  let body: string
  let headers = new Headers()
  try {
    const res = await (deps.fetch ?? fetch)(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    })
    status = res.status
    headers = res.headers
    body = (await res.text()).slice(0, 4000)
  } catch (err) {
    body = String(err)
  }
  const latencyMs = now() - started
  const c = adapter.classify(status, body, headers)
  const extra = {
    statusCode: status || null,
    requestSummary: prepared.summary,
    responseBody: c.outcome === 'success' ? null : body,
    latencyMs,
  }
  if (c.outcome === 'success') return finish({ status: 'success', latencyMs }, extra)
  if (c.outcome === 'fatal') return finish({ status: 'failed', reason: c.reason }, extra)
  const delay = nextRetryDelay(attempt, now() - new Date(ev.received_at).getTime(), c.retryAfterMs)
  if (delay === null)
    return finish({ status: 'dead', reason: `retries_exhausted: ${c.reason}` }, extra)
  return finish({ status: 'retry', delayMs: delay, reason: c.reason }, extra)
}

function safeDecrypt(token: string, ring: Keyring): string | null {
  try {
    return decryptSecret(token, ring)
  } catch {
    return null
  }
}
