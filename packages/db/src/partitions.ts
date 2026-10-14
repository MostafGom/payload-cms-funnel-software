import type { Sql } from './client.ts'

/**
 * Daily range partitions on `received_at`/`created_at` (ADR-0004). Created ahead of time by the
 * scheduler and at worker startup; retention drops whole partitions instead of DELETE.
 */
export const PARTITIONED_DAILY = ['events', 'destination_deliveries'] as const
export type DailyPartitionedTable = (typeof PARTITIONED_DAILY)[number]

const day = (d: Date): string => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))

export const partitionName = (table: string, d: Date): string =>
  `${table}_p${day(d).replaceAll('-', '')}`

export async function ensureDailyPartitions(
  sql: Sql,
  table: DailyPartitionedTable,
  opts: { from?: Date; daysAhead?: number; daysBehind?: number } = {},
): Promise<string[]> {
  const today = addDays(opts.from ?? new Date(), 0)
  const created: string[] = []
  for (let i = -(opts.daysBehind ?? 1); i <= (opts.daysAhead ?? 14); i++) {
    const start = addDays(today, i)
    const name = partitionName(table, start)
    const [row] = await sql<
      { exists: boolean }[]
    >`SELECT to_regclass(${`cdp.${name}`}) IS NOT NULL AS exists`
    if (row?.exists) continue
    await sql.unsafe(
      `CREATE TABLE IF NOT EXISTS cdp."${name}" PARTITION OF cdp."${table}"
       FOR VALUES FROM ('${day(start)}T00:00:00Z') TO ('${day(addDays(start, 1))}T00:00:00Z')`,
    )
    created.push(name)
  }
  return created
}

/** Drops partitions whose whole day is older than `before`. Returns dropped names. */
export async function dropDailyPartitionsBefore(
  sql: Sql,
  table: DailyPartitionedTable,
  before: Date,
): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    SELECT c.relname AS name
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = p.relnamespace
    WHERE n.nspname = 'cdp' AND p.relname = ${table}`
  const cutoff = partitionName(table, before)
  const dropped: string[] = []
  for (const { name } of rows) {
    if (/_p\d{8}$/.test(name) && name < cutoff) {
      await sql.unsafe(`DROP TABLE IF EXISTS cdp."${name}"`)
      dropped.push(name)
    }
  }
  return dropped.sort()
}
