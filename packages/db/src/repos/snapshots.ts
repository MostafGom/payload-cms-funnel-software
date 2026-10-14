import type { Sql } from '../client.ts'

export interface SnapshotRow<T = Record<string, unknown>> {
  kind: string
  id: string
  data: T
  version: number
  deleted: boolean
  updated_at: string
}

export async function upsertSnapshot(
  sql: Sql,
  s: { kind: string; id: string; data: Record<string, unknown>; deleted?: boolean },
): Promise<void> {
  await sql`
    INSERT INTO cdp.config_snapshots (kind, id, data, deleted)
    VALUES (${s.kind}, ${s.id}, ${JSON.stringify(s.data)}::text::jsonb, ${s.deleted ?? false})
    ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data, deleted = EXCLUDED.deleted,
      version = cdp.config_snapshots.version + 1, updated_at = now()`
}

export async function getSnapshot(sql: Sql, kind: string, id: string): Promise<SnapshotRow | null> {
  const [r] = await sql<SnapshotRow[]>`
    SELECT kind, id, data, version, deleted, updated_at FROM cdp.config_snapshots
    WHERE kind = ${kind} AND id = ${id} AND NOT deleted`
  return r ?? null
}

export async function listSnapshots(sql: Sql, kind: string): Promise<SnapshotRow[]> {
  return sql<SnapshotRow[]>`
    SELECT kind, id, data, version, deleted, updated_at FROM cdp.config_snapshots
    WHERE kind = ${kind} AND NOT deleted ORDER BY id`
}

/** Cheap change detection for caches: max(updated_at) per kind. */
export async function snapshotsVersion(sql: Sql, kind: string): Promise<string> {
  const [r] = await sql<{ v: string | null }[]>`
    SELECT max(updated_at)::text || ':' || count(*)::text AS v FROM cdp.config_snapshots WHERE kind = ${kind}`
  return r?.v ?? ''
}
