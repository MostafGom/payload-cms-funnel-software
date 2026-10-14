import { describe, expect, it } from 'vitest'
import { fixtureContext } from '@fp/destinations-sdk/fixture'
import { tiktokEvents } from './index.ts'

describe('FR-DST-2/5/8: TikTok Events API adapter', () => {
  it('golden payload', async () => {
    const r = tiktokEvents.prepare(fixtureContext('tiktok', { testMode: true }))
    expect(r.url).toBe('https://business-api.tiktok.com/open_api/v1.3/event/track/')
    expect(r.headers['Access-Token']).toBe('TOKEN')
    await expect(JSON.stringify(JSON.parse(r.body), null, 2)).toMatchFileSnapshot(
      '../fixtures/submit-form.json',
    )
  })
  it('classifies business codes inside HTTP 200', () => {
    const h = new Headers()
    expect(tiktokEvents.classify(200, '{"code":0,"message":"OK"}', h)).toEqual({
      outcome: 'success',
    })
    expect(tiktokEvents.classify(200, '{"code":40100}', h)).toMatchObject({ outcome: 'retry' })
    expect(tiktokEvents.classify(200, '{"code":40001,"message":"bad"}', h)).toMatchObject({
      outcome: 'fatal',
    })
  })
})
