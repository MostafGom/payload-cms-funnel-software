import { Redis, type RedisOptions } from 'ioredis'

/**
 * BullMQ requires `maxRetriesPerRequest: null` on worker connections; we use it everywhere so a
 * single factory serves streams, queues and rate limiting.
 */
export function createRedis(url: string, opts: RedisOptions = {}): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true, ...opts })
}

export type { Redis }

const DEDUPE_TTL_SECONDS = 48 * 3600

/**
 * Dedupe-then-append for event streams (ADR-0009): `SET NX` per id, then `XADD` the survivors.
 * Shared by the collector (browser events) and the outbox relay (server events), so a retried
 * event is never appended twice within 48h. On XADD failure the dedupe keys are released.
 */
export async function publishDeduped<T extends { event_id: string }>(
  redis: Redis,
  o: { stream: string; field: string; maxLen: number; keyPrefix?: string },
  events: T[],
): Promise<{ accepted: number; duplicates: number }> {
  const prefix = o.keyPrefix ?? ''
  const dedupe = redis.pipeline()
  for (const e of events)
    dedupe.set(`${prefix}dedupe:${e.event_id}`, '1', 'EX', DEDUPE_TTL_SECONDS, 'NX')
  const results = (await dedupe.exec()) ?? []
  const fresh = events.filter((_, i) => results[i]?.[1] === 'OK')
  if (fresh.length) {
    const add = redis.pipeline()
    for (const e of fresh)
      add.xadd(o.stream, 'MAXLEN', '~', o.maxLen, '*', o.field, JSON.stringify(e))
    const added = (await add.exec()) ?? []
    const failed = added.find(([err]) => err)
    if (failed) {
      await redis.del(...fresh.map((e) => `${prefix}dedupe:${e.event_id}`))
      throw failed[0]
    }
  }
  return { accepted: fresh.length, duplicates: events.length - fresh.length }
}
