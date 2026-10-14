import { describe, expect, it } from 'vitest'
import { journeyDeltas, sessionDeltas, type TrackedEvent } from './aggregate.ts'

const S1 = '0199d5a4-0f6b-7c3e-9a2b-000000000001'
const A1 = '0199d5a4-0f6b-7c3e-9a2b-0000000000a1'
let n = 0
const ev = (over: Partial<TrackedEvent>): TrackedEvent => ({
  workspaceId: 1,
  eventId: `0199d5a4-0f6b-7c3e-9a2b-${String(++n).padStart(12, '0')}`,
  name: 'page_viewed',
  occurredAt: '2026-10-14T10:00:00.000Z',
  sessionId: S1,
  anonymousId: A1,
  contactId: null,
  funnelId: 'f1',
  stepId: 'landing',
  variantKey: null,
  pageUrl: 'https://go.brand.com/?utm_source=meta',
  pagePath: '/',
  referrer: null,
  utmSource: 'meta',
  utmMedium: null,
  utmCampaign: 'spring',
  utmTerm: null,
  utmContent: null,
  clickIds: { fbclid: 'x' },
  deviceType: 'mobile',
  os: 'iOS',
  browser: 'Safari',
  geoCountry: 'us',
  isBot: false,
  ...over,
})

describe('FR-TRK-4: sessions', () => {
  it('folds a batch into one delta per session using the landing page view', () => {
    const [d] = sessionDeltas([
      ev({ name: 'element_clicked', occurredAt: '2026-10-14T10:00:05.000Z' }),
      ev({ occurredAt: '2026-10-14T10:00:00.000Z' }),
      ev({ name: 'form_submitted', occurredAt: '2026-10-14T10:02:00.000Z', stepId: 'form' }),
    ])
    expect(d).toMatchObject({
      sessionId: S1,
      startedAt: '2026-10-14T10:00:00.000Z',
      lastSeenAt: '2026-10-14T10:02:00.000Z',
      eventCount: 3,
      pageviews: 1,
      utmSource: 'meta',
      converted: true,
    })
  })
})

describe('FR-TRK-4 / FR-ANL-1: funnel journeys', () => {
  const order: Record<string, number> = { landing: 0, form: 1, thanks: 2 }
  it('tracks furthest step, first-reached times and conversion; skips bots', () => {
    const deltas = journeyDeltas(
      [
        ev({ stepId: 'landing' }),
        ev({ stepId: 'form', occurredAt: '2026-10-14T10:01:00.000Z' }),
        ev({ name: 'form_submitted', stepId: 'form', occurredAt: '2026-10-14T10:02:00.000Z' }),
        ev({ stepId: 'thanks', occurredAt: '2026-10-14T10:02:01.000Z' }),
        ev({ sessionId: '0199d5a4-0f6b-7c3e-9a2b-000000000002', anonymousId: null, isBot: true }),
      ],
      (_f, s) => order[s] ?? 0,
    )
    expect(deltas).toHaveLength(1)
    expect(deltas[0]).toMatchObject({
      visitorKey: A1,
      furthestStepIndex: 2,
      firstStepId: 'landing',
      steps: { landing: '2026-10-14T10:00:00.000Z', form: '2026-10-14T10:01:00.000Z' },
      convertedAt: '2026-10-14T10:02:00.000Z',
    })
  })

  it('keys unconsented visitors by session', () => {
    const [d] = journeyDeltas([ev({ anonymousId: null })], () => 0)
    expect(d!.visitorKey).toBe(S1)
  })
})
