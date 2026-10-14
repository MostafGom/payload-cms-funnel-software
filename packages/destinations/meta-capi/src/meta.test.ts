import { describe, expect, it } from 'vitest'
import { fixtureContext } from '@fp/destinations-sdk/fixture'
import { metaCapi } from './index.ts'

describe('FR-DST-1/5/6/8: Meta CAPI adapter', () => {
  it('golden payload', async () => {
    const r = metaCapi.prepare(fixtureContext('meta'))
    expect(r.url).toBe('https://graph.facebook.com/v23.0/1234567890/events')
    await expect(JSON.stringify(JSON.parse(r.body), null, 2)).toMatchFileSnapshot(
      '../fixtures/lead.json',
    )
    expect(r.summary).toMatchObject({
      match_keys: expect.arrayContaining(['em', 'ph', 'fbc', 'fbp', 'client_ip_address']),
    })
    expect(JSON.stringify(r.summary)).not.toContain('example.com')
  })
  it('adds LDU and test code when requested', () => {
    const body = JSON.parse(
      metaCapi.prepare(fixtureContext('meta', { limitedDataUse: true, testMode: true })).body,
    )
    expect(body.test_event_code).toBe('TEST123')
    expect(body.data[0]).toMatchObject({
      data_processing_options: ['LDU'],
      data_processing_options_country: 0,
      data_processing_options_state: 0,
    })
  })
  it('builds fbc from fbclid when no cookie exists', () => {
    const ctx = fixtureContext('meta')
    ctx.user.identifiers = {}
    expect(JSON.parse(metaCapi.prepare(ctx).body).data[0].user_data.fbc).toBe(
      `fb.1.${Date.parse('2026-10-14T10:00:00.000Z')}.FBCLID`,
    )
  })
  it('classifies Graph errors', () => {
    const h = new Headers()
    expect(metaCapi.classify(400, JSON.stringify({ error: { code: 190 } }), h)).toEqual({
      outcome: 'fatal',
      reason: 'meta_invalid_token',
    })
    expect(metaCapi.classify(400, JSON.stringify({ error: { code: 17 } }), h)).toMatchObject({
      outcome: 'retry',
    })
    expect(
      metaCapi.classify(500, JSON.stringify({ error: { code: 2, is_transient: true } }), h),
    ).toMatchObject({ outcome: 'retry' })
  })
})
