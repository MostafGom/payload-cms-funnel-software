import { INGEST_STREAM_MAXLEN, STREAM_FIELD, STREAMS } from '@fp/event-schemas'
import { publishDeduped, type Redis } from '@fp/platform/redis'
import type { EventSink, RateLimiter } from './ports.ts'

/** ADR-0009: SET NX dedupe, then XADD survivors (shared helper in @fp/platform/redis). */
export function createValkeySink(
  redis: Redis,
  opts: { keyPrefix?: string; stream?: string } = {},
): EventSink {
  const prefix = opts.keyPrefix ?? ''
  const stream = opts.stream ?? `${prefix}${STREAMS.ingest}`
  return {
    publish: (events) =>
      publishDeduped(
        redis,
        { stream, field: STREAM_FIELD, maxLen: INGEST_STREAM_MAXLEN, keyPrefix: prefix },
        events,
      ),
    async ping() {
      return (await redis.ping()) === 'PONG'
    },
  }
}

/** Fixed 10s window counter. Good enough for abuse protection; not a billing meter. */
export function createValkeyRateLimiter(
  redis: Redis,
  limitPer10s: number,
  keyPrefix = '',
): RateLimiter {
  return {
    async consume(key, cost) {
      const window = Math.floor(Date.now() / 10_000)
      const k = `${keyPrefix}rl:${key}:${window}`
      const [[, count]] = (await redis.multi().incrby(k, cost).expire(k, 20).exec()) as [
        [null, number],
        unknown,
      ]
      return count <= limitPer10s
    },
  }
}
