import { afterAll, describe, expect, it } from 'vitest'
import { createDb, repos } from '@fp/db'

/**
 * ADR-0025 contract: workers read `cms.contacts` through @fp/db's read model. Runs against the
 * migrated database (CI applies `pnpm db:migrate` first), so a Payload change that renames or
 * drops a column the workers rely on fails here instead of in production.
 */
const { sql } = createDb(process.env.DATABASE_URL ?? 'postgres://fp:fp@localhost:54330/fp', {
  max: 1,
})
afterAll(() => sql.end())

describe('ADR-0025: cms read model contract', () => {
  it('the contacts read model query runs against the current Payload schema', async () => {
    const r = await repos.getContacts(sql, ['00000000-0000-7000-8000-000000000000'])
    expect(r.size).toBe(0)
  })

  it('enum values the workers depend on exist', async () => {
    const rows = await sql<{ enum: string; value: string }[]>`
      SELECT t.typname AS enum, e.enumlabel AS value FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'cms'
        AND t.typname IN ('enum_contacts_marketing_status', 'enum_contacts_status')`
    const values = rows.map((r) => `${r.enum}:${r.value}`)
    for (const v of ['subscribed', 'unconfirmed', 'unsubscribed', 'none'])
      expect(values).toContain(`enum_contacts_marketing_status:${v}`)
    for (const v of ['active', 'merged', 'erased'])
      expect(values).toContain(`enum_contacts_status:${v}`)
  })
})

describe('ADR-0025: worker test stub matches the real cms schema', () => {
  it('every stub column exists in the migrated schema with the same type', async () => {
    const { createTestDatabase, createCmsStub } = await import('@fp/testing')
    const t = await createTestDatabase()
    try {
      await createCmsStub(t.sql)
      const cols = (s: typeof sql) => s<
        { table_name: string; column_name: string; udt_name: string }[]
      >`
        SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_schema = 'cms'`
      const real = new Map(
        (await cols(sql)).map((c) => [`${c.table_name}.${c.column_name}`, c.udt_name]),
      )
      for (const c of await cols(t.sql)) {
        if (c.column_name === 'id' && c.table_name === 'contacts_rels') continue
        expect(
          real.get(`${c.table_name}.${c.column_name}`),
          `${c.table_name}.${c.column_name}`,
        ).toBe(c.udt_name)
      }
    } finally {
      await t.drop()
    }
  })
})
