import { randomBytes } from 'node:crypto'
import { createRedis, type Redis } from '@fp/platform/redis'

export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6390'

export interface TestRedis {
  redis: Redis
  /** unique key prefix so parallel tests never collide */
  prefix: string
  close(): Promise<void>
}

export async function createTestRedis(): Promise<TestRedis> {
  const redis = createRedis(TEST_REDIS_URL)
  const prefix = `test:${randomBytes(4).toString('hex')}:`
  return {
    redis,
    prefix,
    async close() {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length) await redis.del(...keys)
      redis.disconnect()
    },
  }
}
