import { randomBytes } from 'node:crypto'
import postgres from 'postgres'

/**
 * Integration tests get a throwaway database on the dev/CI Postgres so they never touch dev data
 * and can run in parallel CI jobs. Requires `pnpm infra:up` locally (service container in CI).
 * Callers apply migrations themselves (keeps @fp/testing free of a dependency on @fp/db).
 */
export const TEST_ADMIN_URL =
  process.env.TEST_DATABASE_ADMIN_URL ?? 'postgres://fp:fp@localhost:54330/fp'

export interface TestDatabase {
  url: string
  sql: postgres.Sql
  drop(): Promise<void>
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `fp_test_${randomBytes(4).toString('hex')}`
  const admin = postgres(TEST_ADMIN_URL, { max: 1, onnotice: () => {} })
  await admin.unsafe(`CREATE DATABASE ${name}`)

  const url = new URL(TEST_ADMIN_URL)
  url.pathname = `/${name}`
  const sql = postgres(url.toString(), {
    max: 5,
    onnotice: () => {},
    connection: { application_name: 'fp-test' },
  })

  return {
    url: url.toString(),
    sql,
    async drop() {
      await sql.end()
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
      await admin.end()
    },
  }
}
