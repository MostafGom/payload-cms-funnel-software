import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.ts'

export type Sql = postgres.Sql
export type Db = PostgresJsDatabase<typeof schema>

/** postgres.js client + typed drizzle wrapper over the `cdp` schema (ADR-0003). */
export function createDb(
  url: string,
  opts: { max?: number; appName?: string } = {},
): { sql: Sql; db: Db } {
  const sql = postgres(url, {
    max: opts.max ?? 10,
    connection: { application_name: opts.appName ?? 'fp' },
    onnotice: () => {},
  })
  return { sql, db: drizzle(sql, { schema }) }
}
