import { describe, expect, it } from 'vitest'
import { fixtureContext } from '@fp/destinations-sdk/fixture'
import { snapCapi } from './index.ts'

describe('FR-DST-3/5/8: Snap CAPI adapter', () => {
  it('golden payload', async () => {
    const r = snapCapi.prepare(fixtureContext('snap'))
    expect(r.url).toBe('https://tr.snapchat.com/v3/1234567890/events')
    expect(r.headers.authorization).toBe('Bearer TOKEN')
    await expect(JSON.stringify(JSON.parse(r.body), null, 2)).toMatchFileSnapshot(
      '../fixtures/sign-up.json',
    )
  })
  it('uses the validate endpoint in test mode', () => {
    expect(snapCapi.prepare(fixtureContext('snap', { testMode: true })).url).toBe(
      'https://tr.snapchat.com/v3/1234567890/events/validate',
    )
  })
})
