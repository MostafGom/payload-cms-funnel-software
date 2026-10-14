import { mkdtemp, writeFile, copyFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '@fp/testing'
import { MIGRATIONS_DIR, migrate } from './migrator.ts'
import { dropDailyPartitionsBefore, ensureDailyPartitions, partitionName } from './partitions.ts'
import * as schema from './schema/index.ts'

let t: TestDatabase
beforeAll(async () => {
  t = await createTestDatabase()
  await migrate(t.sql)
})
afterAll(async () => {
  await t?.drop()
})

describe('ADR-0020: migrator', () => {
  it('is idempotent', async () => {
    const r = await migrate(t.sql)
    expect(r.applied).toEqual([])
    expect(r.skipped.length).toBeGreaterThan(0)
  })

  it('refuses to run when an applied migration was edited', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'fp-mig-'))
    for (const f of await readdir(MIGRATIONS_DIR))
      await copyFile(path.join(MIGRATIONS_DIR, f), path.join(dir, f))
    await writeFile(path.join(dir, '0001_events.sql'), '-- edited\n', { flag: 'a' })
    await expect(migrate(t.sql, dir)).rejects.toThrow(/modified after being applied/)
  })
})

describe('ADR-0004: daily partitions', () => {
  it('creates partitions ahead and drops old ones', async () => {
    const from = new Date('2030-01-10T12:00:00Z')
    const created = await ensureDailyPartitions(t.sql, 'events', {
      from,
      daysAhead: 2,
      daysBehind: 2,
    })
    expect(created).toEqual([
      'events_p20300108',
      'events_p20300109',
      'events_p20300110',
      'events_p20300111',
      'events_p20300112',
    ])
    expect(
      await ensureDailyPartitions(t.sql, 'events', { from, daysAhead: 2, daysBehind: 2 }),
    ).toEqual([])

    const dropped = await dropDailyPartitionsBefore(
      t.sql,
      'events',
      new Date('2030-01-10T00:00:00Z'),
    )
    expect(dropped).toContain('events_p20300108')
    expect(dropped).toContain('events_p20300109')
    expect(dropped).not.toContain(partitionName('events', from))
  })

  it('routes rows to the right partition and dedupes on (event_id, received_at)', async () => {
    await ensureDailyPartitions(t.sql, 'events', {
      from: new Date('2030-02-01T00:00:00Z'),
      daysAhead: 0,
      daysBehind: 0,
    })
    const row = {
      event_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a59',
      received_at: '2030-02-01T10:00:00Z',
      occurred_at: '2030-02-01T10:00:00Z',
      name: 'page_viewed',
      schema_v: 1,
      source: 'browser',
      session_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a5a',
      consent: 1,
    }
    await t.sql`INSERT INTO cdp.events ${t.sql(row)} ON CONFLICT DO NOTHING`
    await t.sql`INSERT INTO cdp.events ${t.sql(row)} ON CONFLICT DO NOTHING`
    const [r] = await t.sql`SELECT count(*)::int AS n FROM cdp.events_p20300201`
    expect(r?.n).toBe(1)
  })
})

describe('ADR-0003: schema drift', () => {
  const tables = (Object.values(schema) as unknown[]).filter(
    (v): v is PgTable => v instanceof PgTable,
  )

  it('every cdp table in the database has a drizzle definition', async () => {
    const dbTables = await t.sql<{ table_name: string }[]>`
      SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'cdp' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
        AND c.relname <> '_migrations'`
    expect(tables.map((tb) => getTableConfig(tb).name).sort()).toEqual(
      dbTables.map((r) => r.table_name).sort(),
    )
  })

  it.each(tables.map((tb) => [getTableConfig(tb).name, tb] as const))(
    'drizzle definition of %s matches the migrated table',
    async (name, table) => {
      const cfg = getTableConfig(table)
      const dbCols = await t.sql<{ column_name: string; is_nullable: string }[]>`
        SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = 'cdp' AND table_name = ${name} ORDER BY column_name`
      const defCols = cfg.columns
        .map((c) => ({ column_name: c.name, is_nullable: c.notNull ? 'NO' : 'YES' }))
        .sort((a, b) => a.column_name.localeCompare(b.column_name))
      expect(defCols).toEqual(dbCols)
    },
  )
})

describe('FR-CNS-2: consent log is append-only', () => {
  const rec = {
    id: '0199d5a4-0f6b-7c3e-9a2b-000000000c01',
    recorded_at: '2030-01-01T00:00:00Z',
    anonymous_id: '0199d5a4-0f6b-7c3e-9a2b-000000000a01',
    region: 'DE',
    regime: 'opt_in',
    analytics: true,
    marketing: false,
    source: 'banner',
  }
  it('rejects edits and deletes but allows pseudonymisation and retention deletes', async () => {
    await t.sql`INSERT INTO cdp.consent_records ${t.sql(rec)}`
    await expect(
      t.sql`UPDATE cdp.consent_records SET marketing = true WHERE id = ${rec.id}`,
    ).rejects.toThrow(/append-only/)
    await expect(t.sql`DELETE FROM cdp.consent_records WHERE id = ${rec.id}`).rejects.toThrow(
      /append-only/,
    )
    await t.sql`UPDATE cdp.consent_records SET anonymous_id = NULL WHERE id = ${rec.id}`
    await t.sql.begin(async (tx) => {
      await tx`SELECT set_config('fp.consent_retention', 'on', true)`
      await tx`DELETE FROM cdp.consent_records WHERE id = ${rec.id}`
    })
    const [r] = await t.sql`SELECT count(*)::int AS n FROM cdp.consent_records`
    expect(r?.n).toBe(0)
  })
})
