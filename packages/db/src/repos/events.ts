import { getTableColumns } from 'drizzle-orm'
import type { Sql } from '../client.ts'
import { events, type EventRow } from '../schema/events.ts'
import { bulkInsert, type BulkColumn } from './bulk.ts'

const PROPS = Object.entries(getTableColumns(events)).map(([prop, c]) => ({
  prop,
  name: c.name,
  type: c.getSQLType(),
}))
const castOf = (t: string): BulkColumn['cast'] =>
  t === 'jsonb'
    ? 'jsonb'
    : t === 'uuid'
      ? 'uuid'
      : t.startsWith('timestamp')
        ? 'timestamptz'
        : t === 'inet'
          ? 'inet'
          : t === 'boolean'
            ? 'bool'
            : t === 'smallint' || t === 'integer'
              ? 'int'
              : undefined
const COLUMNS: BulkColumn[] = PROPS.map((p) => ({ name: p.name, cast: castOf(p.type) }))

/**
 * Multi-row insert with dedupe on the primary key (NFR-8). Runs inside a caller's transaction.
 * Returns the ids that were actually new.
 */
export async function insertEvents(sql: Sql, rows: EventRow[]): Promise<Set<string>> {
  const values = rows.map((row) =>
    Object.fromEntries(
      PROPS.map((p) => [
        p.name,
        (row as Record<string, unknown>)[p.prop] ??
          (p.name === 'properties'
            ? {}
            : p.name === 'workspace_id'
              ? 1
              : p.name === 'is_bot'
                ? false
                : null),
      ]),
    ),
  )
  const inserted = await bulkInsert<{ event_id: string }>(
    sql,
    'cdp.events',
    COLUMNS,
    values,
    'ON CONFLICT DO NOTHING RETURNING event_id',
  )
  return new Set(inserted.map((r) => r.event_id))
}
