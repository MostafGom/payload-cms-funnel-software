import { describe, expect, it } from 'vitest'
import { enrichedEvent } from './fixtures.ts'
import { toEventRow } from './map.ts'

describe('FR-TRK-3 / ADR-0012: event row mapping', () => {
  it('extracts utm + click ids and never persists the full IP', () => {
    const row = toEventRow(enrichedEvent())
    expect(row).toMatchObject({
      utmSource: 'fb',
      utmCampaign: 'fall',
      clickIds: { fbclid: 'F1', ScCid: 'S1' },
      ipTrunc: '203.0.113.0',
      consent: 7,
      deviceType: 'mobile',
    })
    expect(JSON.stringify(row)).not.toContain('203.0.113.77')
  })

  it('uses the skew-corrected timestamp', () => {
    const row = toEventRow(
      enrichedEvent({
        occurred_at: '2026-01-01T00:00:00Z',
        occurred_at_corrected: '2026-01-01T01:00:00Z',
      }),
    )
    expect(row.occurredAt).toBe('2026-01-01T01:00:00Z')
  })
})

describe('NFR-8: outages are not poison messages', async () => {
  const { isTransientDbError } = await import('./consumer.ts')
  it('classifies connection and shutdown errors as transient', () => {
    expect(isTransientDbError({ code: 'ECONNREFUSED' })).toBe(true)
    expect(isTransientDbError({ message: 'wrapped', cause: { code: '57P01' } })).toBe(true)
    expect(isTransientDbError({ code: '08006' })).toBe(true)
    expect(isTransientDbError({ code: '22P02' })).toBe(false) // invalid input: poison
  })
})
