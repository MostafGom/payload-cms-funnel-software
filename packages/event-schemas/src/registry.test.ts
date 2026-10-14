import { describe, expect, it } from 'vitest'
import { EventEnvelope, EventBatch } from './envelope.ts'
import {
  EVENT_REGISTRY,
  isConversionEvent,
  normalizeEvent,
  type EventDefinition,
} from './registry.ts'
import { encodeConsent, hasConsent } from './consent.ts'

const base = {
  event_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a59',
  occurred_at: '2026-10-13T10:00:00.000Z',
  session_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a5a',
  sdk_v: '1.0.0',
  page: { url: 'https://go.brand.com/offer?utm_source=fb', path: '/offer' },
}

describe('FR-TRK-1: event envelope', () => {
  it('applies defaults', () => {
    const e = EventEnvelope.parse({ ...base, name: 'page_viewed' })
    expect(e.schema_v).toBe(1)
    expect(e.properties).toEqual({})
    expect(e.context).toEqual({})
  })

  it('rejects bad names, non-uuid ids and oversized properties', () => {
    expect(EventEnvelope.safeParse({ ...base, name: 'Page Viewed' }).success).toBe(false)
    expect(EventEnvelope.safeParse({ ...base, name: 'page_viewed', event_id: 'x' }).success).toBe(
      false,
    )
    expect(
      EventEnvelope.safeParse({ ...base, name: 'custom', properties: { blob: 'x'.repeat(5000) } })
        .success,
    ).toBe(false)
  })

  it('limits batch size', () => {
    const ok = { v: 1, sk: 'site', sent_at: base.occurred_at, batch: [{}] }
    expect(EventBatch.safeParse(ok).success).toBe(true)
    expect(EventBatch.safeParse({ ...ok, batch: Array(51).fill({}) }).success).toBe(false)
  })
})

describe('ADR-0008: schema registry', () => {
  it('maps unknown event names to custom without losing data', () => {
    const r = normalizeEvent(
      EventEnvelope.parse({ ...base, name: 'video_played', properties: { pct: 50 } }),
    )
    expect(r.ok && r.event.name).toBe('custom')
    expect(r.ok && r.event.properties).toEqual({ pct: 50, custom_name: 'video_played' })
  })

  it('rejects unknown versions and invalid properties', () => {
    expect(
      normalizeEvent(EventEnvelope.parse({ ...base, name: 'page_viewed', schema_v: 99 })),
    ).toMatchObject({ ok: false, reason: 'unknown_version' })
    expect(
      normalizeEvent(
        EventEnvelope.parse({ ...base, name: 'scroll_depth_reached', properties: { depth: 140 } }),
      ),
    ).toMatchObject({ ok: false, reason: 'invalid_properties' })
  })

  it('every registered version up to latest is reachable', () => {
    for (const [name, def] of Object.entries(EVENT_REGISTRY as Record<string, EventDefinition>)) {
      expect(def.versions[def.latest], `${name} latest`).toBeDefined()
    }
  })

  it('flags conversion events', () => {
    expect(isConversionEvent('form_submitted')).toBe(true)
    expect(isConversionEvent('page_viewed')).toBe(false)
  })
})

describe('ADR-0011: consent bitmask', () => {
  it('always includes necessary and encodes purposes', () => {
    const m = encodeConsent({ analytics: true, marketing: false })
    expect(hasConsent(m, 'necessary')).toBe(true)
    expect(hasConsent(m, 'analytics')).toBe(true)
    expect(hasConsent(m, 'marketing')).toBe(false)
  })
})
