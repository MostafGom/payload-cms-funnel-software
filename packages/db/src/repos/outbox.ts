import type { Sql } from '../client.ts'
import { bulkInsert } from './bulk.ts'

export interface OutboxMessage {
  id: string
  workspace_id: number
  topic: string
  key: string | null
  payload: Record<string, unknown>
  traceparent: string | null
  attempts: number
  created_at: string
}

/**
 * Claims up to `limit` due messages with SKIP LOCKED so several relays can run (ADR-0006), hands
 * them to `handle`, then marks each published or schedules a retry with exponential backoff.
 * `handle` returns the ids it failed on with their error.
 */
export async function relayOutbox(
  sql: Sql,
  limit: number,
  handle: (msgs: OutboxMessage[]) => Promise<Map<string, string>>,
): Promise<{ published: number; failed: number }> {
  return sql.begin(async (tx) => {
    const msgs = await tx<OutboxMessage[]>`
      SELECT id, workspace_id, topic, key, payload, traceparent, attempts, created_at
      FROM cdp.outbox
      WHERE published_at IS NULL AND available_at <= now()
      ORDER BY available_at, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`
    if (!msgs.length) return { published: 0, failed: 0 }
    const failures = await handle(msgs)
    const ok = msgs.filter((m) => !failures.has(m.id)).map((m) => m.id)
    if (ok.length)
      await tx`UPDATE cdp.outbox SET published_at = now() WHERE id = ANY(${ok}::uuid[])`
    for (const [id, error] of failures) {
      await tx`
        UPDATE cdp.outbox SET attempts = attempts + 1, last_error = ${error.slice(0, 1000)},
          available_at = now() + make_interval(secs => LEAST(3600, 2 ^ LEAST(attempts, 12)))
        WHERE id = ${id}`
    }
    return { published: ok.length, failed: failures.size }
  }) as Promise<{ published: number; failed: number }>
}

export async function insertOutbox(
  sql: Sql,
  rows: {
    id: string
    workspaceId: number
    topic: string
    key?: string | null
    payload: Record<string, unknown>
    traceparent?: string | null
  }[],
): Promise<void> {
  await bulkInsert(
    sql,
    'cdp.outbox',
    [
      { name: 'id', cast: 'uuid' },
      { name: 'workspace_id', cast: 'int' },
      { name: 'topic' },
      { name: 'key' },
      { name: 'payload', cast: 'jsonb' },
      { name: 'traceparent' },
    ],
    rows.map((r) => ({
      id: r.id,
      workspace_id: r.workspaceId,
      topic: r.topic,
      key: r.key ?? null,
      payload: r.payload,
      traceparent: r.traceparent ?? null,
    })),
  )
}

/** Housekeeping: published rows are kept 7 days for debugging. */
export async function purgePublishedOutbox(sql: Sql, olderThanDays = 7): Promise<number> {
  const r = await sql`
    DELETE FROM cdp.outbox WHERE published_at < now() - make_interval(days => ${olderThanDays})`
  return r.count
}
