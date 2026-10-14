import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { getCookie, setCookie } from 'hono/cookie'
import { normalizeRegion, regimeFor, resolveConsent, type RegimeOverrides } from '@fp/consent'
import type { EnrichedEvent } from '@fp/event-schemas'
import { EventBatch, EventEnvelope, normalizeEvent } from '@fp/event-schemas'
import { isUuidV7, uuidv7 } from '@fp/platform/ids'
import type { Logger } from '@fp/platform/logger'
import {
  metrics,
  contextFromTraceparent,
  currentTraceparent,
  SpanKind,
  trace,
  withSpan,
  type Tracer,
} from '@fp/platform/otel'
import { enrichEvent } from './enrich.ts'
import type { EventSink, RateLimiter } from './ports.ts'

export const MAX_BODY_BYTES = 64 * 1024
/** Chrome caps cookie lifetime at 400 days. */
const COOKIE_MAX_AGE = 400 * 24 * 3600
/** First-party cookies forwarded to server-side destinations (FR-DST-5). */
const CAPTURED_COOKIES = ['_fbp', '_fbc', '_ttp', '_scid', '_cm_aid'] as const

export interface CollectorDeps {
  sink: EventSink
  rateLimiter: RateLimiter
  logger: Logger
  siteKeys: Map<string, number>
  cookieDomain: string
  clientIpHeader: string
  /** consent regime overrides (mirrors ConsentSettings in the CMS) */
  consentOverrides?: RegimeOverrides
  /** honour `x-fp-debug-geo` (consent test matrix); never in production */
  allowDebugGeo?: boolean
  tracer?: Tracer
  now?: () => Date
}

export function createApp(deps: CollectorDeps): Hono {
  const now = deps.now ?? (() => new Date())
  const tracer = deps.tracer ?? trace.getTracer('collector')
  const meter = metrics.getMeter('collector')
  const duration = meter.createHistogram('http_server_duration', {
    unit: 'milliseconds',
    description: 'Collector request duration',
  })
  const accepted = meter.createCounter('fp_collector_events', {
    description: 'Events accepted / duplicate / rejected',
  })
  const app = new Hono()

  // One server span per request; its traceparent rides inside each stream entry (NFR-14).
  app.use('/_t/*', (c, next) =>
    withSpan(
      tracer,
      `${c.req.method} ${c.req.path}`,
      {
        kind: SpanKind.SERVER,
        parent: contextFromTraceparent(c.req.header('traceparent')),
        attributes: { 'http.request.method': c.req.method, 'url.path': c.req.path },
      },
      async (span) => {
        const t0 = performance.now()
        await next()
        span.setAttribute('http.response.status_code', c.res.status)
        duration.record(performance.now() - t0, { route: c.req.path, status: c.res.status })
      },
    ),
  )

  app.get('/_t/healthz', (c) => c.text('ok'))
  app.get('/_t/readyz', async (c) =>
    (await deps.sink.ping().catch(() => false)) ? c.text('ok') : c.text('sink unavailable', 503),
  )

  app.post(
    '/_t/e',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ error: 'payload_too_large' }, 413),
    }),
    async (c) => {
      const receivedAt = now()
      // sendBeacon posts text/plain to avoid a CORS preflight, so parse manually.
      let raw: unknown
      try {
        raw = JSON.parse(await c.req.text())
      } catch {
        return c.json({ error: 'invalid_json' }, 400)
      }
      const batch = EventBatch.safeParse(raw)
      if (!batch.success)
        return c.json({ error: 'invalid_batch', issues: batch.error.issues.slice(0, 5) }, 400)

      const workspaceId = deps.siteKeys.get(batch.data.sk)
      if (workspaceId === undefined) return c.json({ error: 'unknown_site_key' }, 403)

      const ip = clientIp(c.req.header(deps.clientIpHeader), c.env)
      if (!(await deps.rateLimiter.consume(ip ?? 'unknown', batch.data.batch.length))) {
        return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '10' })
      }

      const cookies: Record<string, string> = {}
      for (const name of CAPTURED_COOKIES) {
        const v = getCookie(c, name)
        if (v) cookies[name] = v
      }
      const existingAid = cookies._cm_aid && isUuidV7(cookies._cm_aid) ? cookies._cm_aid : null

      const valid: EventEnvelope[] = []
      let rejected = 0
      for (const item of batch.data.batch) {
        const parsed = EventEnvelope.safeParse(item)
        const normalized = parsed.success ? normalizeEvent(parsed.data) : null
        if (normalized?.ok) valid.push(normalized.event)
        else rejected++
      }

      // Server-side consent (FR-CNS-3): regime from the edge geo, the client's explicit choice,
      // and the GPC header. The client can only ever narrow what the regime allows.
      const debugGeo = deps.allowDebugGeo ? c.req.header('x-fp-debug-geo') : undefined
      const [dc, ds] = debugGeo?.split('-') ?? []
      const region = debugGeo
        ? normalizeRegion(dc, ds)
        : normalizeRegion(c.req.header('cf-ipcountry'), c.req.header('cf-region-code'))
      const regime = regimeFor(region, deps.consentOverrides)
      const gpc = c.req.header('sec-gpc') === '1'
      const choiceOf = (e: EventEnvelope) => {
        const k = e.context.consent
        return k && k.d !== false && (k.d === true || regime !== 'opt_in')
          ? { analytics: k.a, marketing: k.m }
          : null
      }
      const consentOf = (e: EventEnvelope) => resolveConsent({ regime, choice: choiceOf(e), gpc })
      const analyticsGranted = valid.some((e) => consentOf(e).analytics)
      const marketingGranted = valid.some((e) => consentOf(e).marketing)
      const anonymousId = analyticsGranted ? (existingAid ?? uuidv7()) : null

      if (marketingGranted && !cookies._fbc) {
        const fbc = buildFbc(valid, receivedAt)
        if (fbc) {
          cookies._fbc = fbc
          setFirstPartyCookie(c, '_fbc', fbc, deps.cookieDomain, 90 * 24 * 3600)
        }
      }
      // Without marketing consent no ad-platform identifiers travel downstream (FR-DST-6).
      const forwarded = marketingGranted
        ? cookies
        : { ...(cookies._cm_aid ? { _cm_aid: cookies._cm_aid } : {}) }

      const sentAt = new Date(batch.data.sent_at)
      const enriched: EnrichedEvent[] = valid.map((e) => {
        const ec = consentOf(e)
        // FR-TRK-6: in opt-in regimes nothing linkable is stored before consent.
        const stripIds = !ec.analytics && regime === 'opt_in'
        const event = stripIds ? { ...e, anonymous_id: undefined, session_id: uuidv7() } : e
        return enrichEvent(event, {
          workspaceId,
          receivedAt,
          sentAt,
          ip,
          userAgent: c.req.header('user-agent') ?? null,
          country: c.req.header('cf-ipcountry')?.toLowerCase() ?? null,
          cookies: forwarded,
          anonymousId: ec.analytics ? anonymousId : null,
          traceparent: currentTraceparent(),
          consent: ec,
          region,
        })
      })

      let result = { accepted: 0, duplicates: 0 }
      if (enriched.length) {
        try {
          result = await deps.sink.publish(enriched)
        } catch (err) {
          deps.logger.error({ err }, 'sink publish failed')
          // Fail visibly: the SDK keeps the batch in its retry queue (ADR-0005).
          return c.json({ error: 'unavailable' }, 503, { 'Retry-After': '5' })
        }
      }

      accepted.add(result.accepted, { result: 'accepted' })
      if (result.duplicates) accepted.add(result.duplicates, { result: 'duplicate' })
      if (rejected) accepted.add(rejected, { result: 'rejected' })
      if (anonymousId)
        setFirstPartyCookie(c, '_cm_aid', anonymousId, deps.cookieDomain, COOKIE_MAX_AGE)

      if (rejected) return c.json({ ...result, rejected }, 202)
      return c.body(null, 204)
    },
  )

  return app
}

function setFirstPartyCookie(
  c: Parameters<typeof setCookie>[0],
  name: string,
  value: string,
  domain: string,
  maxAge: number,
) {
  setCookie(c, name, value, {
    path: '/',
    httpOnly: name.startsWith('_cm_'), // platform cookies (_fbc) must stay readable by their pixels
    secure: true,
    sameSite: 'Lax',
    maxAge,
    ...(domain ? { domain } : {}),
  })
}

/** `fb.1.<ms>.<fbclid>` per Meta's spec, from the first event whose landing URL carries fbclid. */
export function buildFbc(events: EventEnvelope[], at: Date): string | null {
  for (const e of events) {
    try {
      const fbclid = new URL(e.page.url).searchParams.get('fbclid')
      if (fbclid) return `fb.1.${at.getTime()}.${fbclid}`
    } catch {
      /* invalid URL already rejected by schema */
    }
  }
  return null
}

function clientIp(header: string | undefined, env: unknown): string | null {
  const fromHeader = header?.split(',')[0]?.trim()
  if (fromHeader) return fromHeader
  // Direct connection (local dev without a proxy).
  const incoming = (env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)
    ?.incoming
  return incoming?.socket?.remoteAddress ?? null
}
