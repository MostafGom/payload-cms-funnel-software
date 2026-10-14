import { describe, expect, it } from 'vitest'
import type { EnrichedEvent } from '@fp/event-schemas'
import { createLogger } from '@fp/platform/logger'
import { startTelemetry } from '@fp/platform/otel'
import { createApp, type CollectorDeps } from './app.ts'
import type { EventSink } from './ports.ts'

const NOW = new Date('2026-10-13T12:00:00.000Z')

function setup(over: Partial<CollectorDeps> = {}) {
  const published: EnrichedEvent[] = []
  const seen = new Set<string>()
  const sink: EventSink = {
    async publish(events) {
      const fresh = events.filter((e) => !seen.has(e.event_id))
      fresh.forEach((e) => seen.add(e.event_id))
      published.push(...fresh)
      return { accepted: fresh.length, duplicates: events.length - fresh.length }
    },
    ping: async () => true,
  }
  const app = createApp({
    sink,
    rateLimiter: { consume: async () => true },
    logger: createLogger({ service: 'test', level: 'silent' }),
    siteKeys: new Map([['site', 1]]),
    cookieDomain: '.brand.com',
    clientIpHeader: 'x-forwarded-for',
    now: () => NOW,
    ...over,
  })
  return { app, published }
}

let n = 0
const event = (over: Record<string, unknown> = {}) => ({
  event_id: `0199d5a4-0f6b-7c3e-9a2b-${String(++n).padStart(12, '0')}`,
  name: 'page_viewed',
  occurred_at: '2026-10-13T11:59:59.000Z',
  session_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a5a',
  sdk_v: '1.0.0',
  page: { url: 'https://go.brand.com/offer?utm_source=fb&fbclid=ABC123', path: '/offer' },
  context: { consent: { a: true, m: true, d: true } },
  ...over,
})

const post = (
  app: ReturnType<typeof setup>['app'],
  body: unknown,
  headers: Record<string, string> = {},
) =>
  app.request('/_t/e', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'text/plain',
      'x-forwarded-for': '203.0.113.77, 10.0.0.1',
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ...headers,
    },
  })

const batch = (events: unknown[], sk = 'site') => ({
  v: 1,
  sk,
  sent_at: NOW.toISOString(),
  batch: events,
})

describe('FR-TRK-2/3: collector /_t/e', () => {
  it('accepts a batch, enriches it and returns 204', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event()]))
    expect(res.status).toBe(204)
    expect(published).toHaveLength(1)
    const e = published[0]!
    expect(e.workspace_id).toBe(1)
    expect(e.ip).toBe('203.0.113.77')
    expect(e.ip_trunc).toBe('203.0.113.0')
    expect(e.device).toMatchObject({ type: 'mobile', os: 'iOS' })
    expect(e.is_bot).toBe(false)
    expect(e.anonymous_id).toBeDefined()
  })

  it('NFR-8: drops duplicate event ids', async () => {
    const { app, published } = setup()
    const e = event()
    await post(app, batch([e]))
    await post(app, batch([e]))
    expect(published).toHaveLength(1)
  })

  it('accepts valid events and reports rejected ones with 202', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event(), { name: 'broken' }]))
    expect(res.status).toBe(202)
    expect(await res.json()).toMatchObject({ accepted: 1, rejected: 1 })
    expect(published).toHaveLength(1)
  })

  it('rejects malformed json, bad batches and unknown site keys', async () => {
    const { app } = setup()
    expect((await post(app, '{nope')).status).toBe(400)
    expect((await post(app, { v: 2 })).status).toBe(400)
    expect((await post(app, batch([event()], 'other'))).status).toBe(403)
  })

  it('enforces the body limit', async () => {
    const { app } = setup()
    expect((await post(app, 'x'.repeat(70 * 1024))).status).toBe(413)
  })

  it('returns 429 when rate limited and 503 when the sink fails', async () => {
    expect(
      (await post(setup({ rateLimiter: { consume: async () => false } }).app, batch([event()])))
        .status,
    ).toBe(429)
    const failing = setup({
      sink: { publish: async () => Promise.reject(new Error('down')), ping: async () => false },
    })
    expect((await post(failing.app, batch([event()]))).status).toBe(503)
    expect((await failing.app.request('/_t/readyz')).status).toBe(503)
  })

  it('corrects client clock skew and never stores future timestamps', async () => {
    const { app, published } = setup()
    // client clock is 1h behind: sent_at 11:00 while server receives at 12:00
    await post(app, {
      v: 1,
      sk: 'site',
      sent_at: '2026-10-13T11:00:00.000Z',
      batch: [event({ occurred_at: '2026-10-13T10:59:58.000Z' })],
    })
    expect(published[0]!.occurred_at_corrected).toBe('2026-10-13T11:59:58.000Z')
  })
})

describe('FR-TRK-6 / ADR-0011: consent-gated identifiers', () => {
  it('sets an HttpOnly first-party _cm_aid only with analytics consent', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event()]))
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('_cm_aid='))
    expect(cookie).toMatch(/Domain=\.brand\.com/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Max-Age=34560000/)
    expect(published[0]!.anonymous_id).toBe(cookie!.split(';')[0]!.split('=')[1])
  })

  it('sets no identifier cookies and no anonymous id without consent', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event({ context: { consent: { a: false, m: false } } })]))
    expect(res.headers.getSetCookie()).toEqual([])
    expect(published[0]!.anonymous_id).toBeUndefined()
    expect(published[0]!.consent_mask).toBe(1)
  })

  it('reuses an existing _cm_aid cookie', async () => {
    const { app, published } = setup()
    const aid = '0199d5a4-0f6b-7c3e-9a2b-aaaaaaaaaaaa'
    await post(app, batch([event()]), { cookie: `_cm_aid=${aid}` })
    expect(published[0]!.anonymous_id).toBe(aid)
  })
})

describe('FR-DST-5: Meta click id capture', () => {
  it('builds _fbc from fbclid with marketing consent', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event()]))
    const expected = `fb.1.${NOW.getTime()}.ABC123`
    expect(res.headers.getSetCookie().some((c) => c.startsWith(`_fbc=${expected}`))).toBe(true)
    expect(published[0]!.cookies._fbc).toBe(expected)
  })

  it('keeps an existing _fbc and forwards _fbp', async () => {
    const { app, published } = setup()
    await post(app, batch([event()]), { cookie: '_fbc=fb.1.1.OLD; _fbp=fb.1.1.999' })
    expect(published[0]!.cookies).toMatchObject({ _fbc: 'fb.1.1.OLD', _fbp: 'fb.1.1.999' })
  })
})

describe('NFR-14: trace propagation', () => {
  it('continues the caller trace and stamps its traceparent on every stream entry', async () => {
    startTelemetry({ service: 'test' }) // registers the W3C propagator; no exporter
    const { app, published } = setup()
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
    await post(app, batch([event(), event()]), {
      traceparent: `00-${traceId}-00f067aa0ba902b7-01`,
    })
    expect(published).toHaveLength(2)
    for (const e of published) expect(e.traceparent).toMatch(new RegExp(`^00-${traceId}-`))
  })
})

describe('FR-CNS-3 / FR-TRK-6: server-side regime enforcement', () => {
  const undecided = { context: { consent: { a: true, m: true, d: false } } }
  it('opt-in region without an explicit choice: no identifiers, unlinkable session, no ad cookies', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event(undecided)]), {
      'cf-ipcountry': 'DE',
      cookie: '_fbp=fb.1.1.9',
    })
    expect(res.headers.getSetCookie()).toEqual([])
    const e = published[0]!
    expect(e.anonymous_id).toBeUndefined()
    expect(e.session_id).not.toBe('0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a5a')
    expect(e.cookies).toEqual({})
    expect(e.consent_mask).toBe(1)
    expect(e).toMatchObject({ region: 'DE', regime: 'opt_in' })
  })

  it('opt-out region without a choice: identifiers allowed by default', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event(undecided)]), {
      'cf-ipcountry': 'US',
      'cf-region-code': 'CA',
    })
    expect(res.headers.getSetCookie().some((c) => c.startsWith('_cm_aid='))).toBe(true)
    expect(published[0]).toMatchObject({ region: 'US-CA', regime: 'opt_out', consent_mask: 7 })
  })

  it('GPC turns marketing off in opt-out regions (no _fbc, mask without marketing)', async () => {
    const { app, published } = setup()
    const res = await post(app, batch([event(undecided)]), { 'cf-ipcountry': 'US', 'sec-gpc': '1' })
    expect(res.headers.getSetCookie().some((c) => c.startsWith('_fbc='))).toBe(false)
    expect(published[0]!.consent_mask).toBe(3)
    expect(published[0]!.gpc).toBe(true)
  })

  it('debug geo header only when allowed', async () => {
    const off = setup()
    await post(off.app, batch([event(undecided)]), { 'x-fp-debug-geo': 'US-TX' })
    expect(off.published[0]!.region).toBe('XX')
    const on = setup({ allowDebugGeo: true })
    await post(on.app, batch([event(undecided)]), { 'x-fp-debug-geo': 'US-TX' })
    expect(on.published[0]!.region).toBe('US-TX')
  })

  it('applies configured overrides', async () => {
    const { app, published } = setup({
      consentOverrides: { overrides: [{ region: 'US', regime: 'opt_in' }] },
    })
    await post(app, batch([event(undecided)]), { 'cf-ipcountry': 'US' })
    expect(published[0]!.anonymous_id).toBeUndefined()
  })
})
