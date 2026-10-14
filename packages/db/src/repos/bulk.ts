import type { Sql } from '../client.ts'

/**
 * Multi-row INSERT with explicit per-column casts. JSON columns are bound as text and cast with
 * `::text::jsonb`, which behaves identically inside and outside transactions (postgres.js'
 * row helper picks serializers from the statement description, which double-encodes JSON text).
 * Table and column names are code constants, never user input.
 */
export interface BulkColumn {
  name: string
  cast?: 'jsonb' | 'uuid' | 'timestamptz' | 'inet' | 'int' | 'bool' | 'char2' | 'date'
}

const CAST: Record<NonNullable<BulkColumn['cast']>, string> = {
  jsonb: '::text::jsonb',
  uuid: '::uuid',
  timestamptz: '::timestamptz',
  inet: '::inet',
  int: '::int',
  bool: '::bool',
  char2: '::char(2)',
  date: '::date',
}

export async function bulkInsert<R = Record<string, unknown>>(
  sql: Sql,
  table: string,
  columns: BulkColumn[],
  rows: Record<string, unknown>[],
  suffix = '',
): Promise<R[]> {
  if (!rows.length) return []
  const params: unknown[] = []
  const tuples = rows.map((row) => {
    const cells = columns.map((c) => {
      let v = row[c.name]
      if (v === undefined) v = null
      if (c.cast === 'jsonb' && v !== null) v = JSON.stringify(v)
      else if (v instanceof Date) v = v.toISOString()
      params.push(v)
      return `$${params.length}${c.cast ? CAST[c.cast] : ''}`
    })
    return `(${cells.join(', ')})`
  })
  const text = `INSERT INTO ${table} (${columns.map((c) => `"${c.name}"`).join(', ')}) VALUES ${tuples.join(', ')} ${suffix}`
  return (await sql.unsafe(text, params as never[])) as unknown as R[]
}
