import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sql } from './client.ts'

/**
 * Forward-only SQL migrations for the `cdp` schema (ADR-0003 / ADR-0020).
 * Plain SQL because drizzle-kit cannot express declarative partitioning.
 * - files: `migrations/NNNN_name.sql`, applied in order, each in its own transaction
 * - checksums guard against editing an applied migration (write a new one instead)
 * - an advisory lock makes concurrent migrators safe
 */
export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
)
const LOCK_KEY = 727_001

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

export async function migrate(sql: Sql, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  const files = (await readdir(dir)).filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f)).sort()
  const result: MigrationResult = { applied: [], skipped: [] }

  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`
    await tx`CREATE SCHEMA IF NOT EXISTS cdp`
    await tx`
      CREATE TABLE IF NOT EXISTS cdp._migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`
    const rows = await tx<
      { name: string; checksum: string }[]
    >`SELECT name, checksum FROM cdp._migrations`
    const applied = new Map(rows.map((r) => [r.name, r.checksum]))

    for (const file of files) {
      const body = await readFile(path.join(dir, file), 'utf8')
      const checksum = createHash('sha256').update(body).digest('hex')
      const prev = applied.get(file)
      if (prev) {
        if (prev !== checksum) throw new Error(`Migration ${file} was modified after being applied`)
        result.skipped.push(file)
        continue
      }
      await tx.savepoint(async (sp) => {
        await sp.unsafe(body)
        await sp`INSERT INTO cdp._migrations (name, checksum) VALUES (${file}, ${checksum})`
      })
      result.applied.push(file)
    }
  })
  return result
}
