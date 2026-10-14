import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import { uuidv7 } from '@fp/platform/ids'
import { currentTraceparent } from '@fp/platform/otel'

type SQL = ReturnType<typeof sql>
type Executor = { execute: (q: SQL) => Promise<unknown> }
type Adapter = { drizzle: Executor; sessions: Record<string, { db: Executor } | undefined> }

/**
 * Runs raw SQL on the *same* transaction as the current Payload operation, so writes to `cdp`
 * (outbox, config snapshots) commit or roll back together with the CMS change (ADR-0006/0025).
 */
export async function txExecute(req: PayloadRequest, query: SQL): Promise<void> {
  const adapter = req.payload.db as unknown as Adapter
  const id = req.transactionID ? await req.transactionID : undefined
  const db = (id !== undefined && adapter.sessions[String(id)]?.db) || adapter.drizzle
  await db.execute(query)
}

export interface OutboxWrite {
  topic: string
  payload: Record<string, unknown>
  key?: string
  workspaceId?: number
  /** delay delivery (e.g. send after the response) */
  availableAt?: Date
}

export async function appendOutbox(req: PayloadRequest, rows: OutboxWrite[]): Promise<void> {
  const traceparent = currentTraceparent() ?? null
  for (const r of rows) {
    await txExecute(
      req,
      sql`INSERT INTO cdp.outbox (id, workspace_id, topic, key, payload, traceparent, available_at)
          VALUES (${uuidv7()}, ${r.workspaceId ?? 1}, ${r.topic}, ${r.key ?? null},
                  ${JSON.stringify(r.payload)}::jsonb, ${traceparent},
                  ${(r.availableAt ?? new Date()).toISOString()}::timestamptz)`,
    )
  }
}

export async function writeSnapshot(
  req: PayloadRequest,
  s: { kind: string; id: string; data: Record<string, unknown> | null },
): Promise<void> {
  await txExecute(
    req,
    sql`INSERT INTO cdp.config_snapshots (kind, id, data, deleted)
        VALUES (${s.kind}, ${s.id}, ${JSON.stringify(s.data ?? {})}::jsonb, ${s.data === null})
        ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data, deleted = EXCLUDED.deleted,
          version = cdp.config_snapshots.version + 1, updated_at = now()`,
  )
}
