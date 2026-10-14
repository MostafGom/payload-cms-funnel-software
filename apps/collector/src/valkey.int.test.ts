import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { EnrichedEvent } from '@fp/event-schemas'
import { STREAM_FIELD } from '@fp/event-schemas'
import { createTestRedis, type TestRedis } from '@fp/testing'
import { createValkeyRateLimiter, createValkeySink } from './valkey.ts'

let t: TestRedis
beforeAll(async () => {
  t = await createTestRedis()
})
afterAll(async () => {
  await t.close()
})

const ev = (id: string) => ({ event_id: id, name: 'page_viewed' }) as EnrichedEvent

describe('ADR-0009: Valkey sink', () => {
  it('appends new events to the stream and dedupes repeats', async () => {
    const sink = createValkeySink(t.redis, { keyPrefix: t.prefix })
    expect(await sink.publish([ev('a'), ev('b')])).toEqual({ accepted: 2, duplicates: 0 })
    expect(await sink.publish([ev('b'), ev('c')])).toEqual({ accepted: 1, duplicates: 1 })

    const entries = await t.redis.xrange(`${t.prefix}ingest:events`, '-', '+')
    expect(entries.map(([, f]) => JSON.parse(f[f.indexOf(STREAM_FIELD) + 1]!).event_id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(await sink.ping()).toBe(true)
  })
})

describe('collector rate limiter', () => {
  it('blocks after the window budget is spent', async () => {
    const rl = createValkeyRateLimiter(t.redis, 5, t.prefix)
    expect(await rl.consume('ip', 3)).toBe(true)
    expect(await rl.consume('ip', 2)).toBe(true)
    expect(await rl.consume('ip', 1)).toBe(false)
    expect(await rl.consume('other-ip', 1)).toBe(true)
  })
})
