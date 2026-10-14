import { createDb, type Db, type Sql } from '@fp/db'
import { parseKeyring, type Keyring } from '@fp/platform/crypto'
import { createRedis, type Redis } from '@fp/platform/redis'
import { serverEnv } from './env'

/**
 * Process-wide clients for the `cdp` schema and Valkey (ADR-0003). Payload keeps its own pool for
 * `cms`; writes that must be atomic with a CMS change go through `txExecute` instead.
 */
const g = globalThis as unknown as {
  __fpCdp?: { sql: Sql; db: Db }
  __fpRedis?: Redis
  __fpKeyring?: Keyring
}

export function cdp(): { sql: Sql; db: Db } {
  return (g.__fpCdp ??= createDb(serverEnv().DATABASE_URL, { max: 5, appName: 'fp-web' }))
}

export function redis(): Redis {
  return (g.__fpRedis ??= createRedis(serverEnv().REDIS_URL, { lazyConnect: false }))
}

export function keyring(): Keyring {
  const env = serverEnv()
  return (g.__fpKeyring ??= parseKeyring(env.SECRETS_KEYRING, env.SECRETS_CURRENT_KEY))
}
