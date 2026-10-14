import type { Sql } from '../client.ts'
import { bulkInsert } from './bulk.ts'
import type { DeliveryStatus } from '../schema/delivery.ts'

export interface NewDelivery {
  deliveryId: string
  workspaceId: number
  createdAt: string
  destinationId: string
  destinationType: string
  eventId: string
  eventName: string
  platformEvent: string | null
  contactId: string | null
  status: DeliveryStatus
  testMode: boolean
}

/** Idempotent per (destination, event): re-fanout of the same event returns no new rows. */
export async function createDeliveries(sql: Sql, rows: NewDelivery[]): Promise<NewDelivery[]> {
  if (!rows.length) return []
  const values = rows.map((r) => ({
    delivery_id: r.deliveryId,
    workspace_id: r.workspaceId,
    created_at: r.createdAt,
    destination_id: r.destinationId,
    destination_type: r.destinationType,
    event_id: r.eventId,
    event_name: r.eventName,
    platform_event: r.platformEvent,
    contact_id: r.contactId,
    status: r.status,
    test_mode: r.testMode,
    updated_at: new Date().toISOString(),
    completed_at: r.status.startsWith('skipped') ? new Date().toISOString() : null,
  }))
  const inserted = await bulkInsert<{ delivery_id: string }>(
    sql,
    'cdp.destination_deliveries',
    [
      { name: 'delivery_id', cast: 'uuid' },
      { name: 'workspace_id', cast: 'int' },
      { name: 'created_at', cast: 'timestamptz' },
      { name: 'destination_id' },
      { name: 'destination_type' },
      { name: 'event_id', cast: 'uuid' },
      { name: 'event_name' },
      { name: 'platform_event' },
      { name: 'contact_id', cast: 'uuid' },
      { name: 'status' },
      { name: 'test_mode', cast: 'bool' },
      { name: 'updated_at', cast: 'timestamptz' },
      { name: 'completed_at', cast: 'timestamptz' },
    ],
    values,
    'ON CONFLICT (destination_id, event_id, created_at) DO NOTHING RETURNING delivery_id',
  )
  const ids = new Set(inserted.map((r) => r.delivery_id))
  return rows.filter((r) => ids.has(r.deliveryId))
}

export async function updateDelivery(
  sql: Sql,
  key: { deliveryId: string; createdAt: string },
  u: {
    status: DeliveryStatus
    attempts: number
    statusCode?: number | null
    error?: string | null
    latencyMs?: number | null
    requestSummary?: Record<string, unknown> | null
    responseBody?: string | null
  },
): Promise<void> {
  const done = ['success', 'failed', 'dead'].includes(u.status)
  await sql`
    UPDATE cdp.destination_deliveries SET
      status = ${u.status}, attempts = ${u.attempts},
      last_status_code = ${u.statusCode ?? null}, last_error = ${u.error?.slice(0, 2000) ?? null},
      latency_ms = ${u.latencyMs ?? null},
      request_summary = COALESCE(${u.requestSummary ? JSON.stringify(u.requestSummary) : null}::text::jsonb, request_summary),
      response_body = ${u.responseBody?.slice(0, 4000) ?? null},
      updated_at = now(), completed_at = ${done ? sql`now()` : null}
    WHERE delivery_id = ${key.deliveryId} AND created_at = ${key.createdAt}`
}

export interface DeliveryLookup {
  delivery_id: string
  created_at: string
  destination_id: string
  event_id: string
  event_name: string
  status: DeliveryStatus
  attempts: number
}

/** Deliveries eligible for manual or bulk replay (FR-DST-7). */
export async function findReplayable(
  sql: Sql,
  f: {
    destinationId?: string
    statuses: DeliveryStatus[]
    since: string
    until?: string
    limit: number
  },
): Promise<DeliveryLookup[]> {
  return sql<DeliveryLookup[]>`
    SELECT delivery_id, created_at, destination_id, event_id, event_name, status, attempts
    FROM cdp.destination_deliveries
    WHERE status = ANY(${f.statuses}) AND created_at >= ${f.since}
      AND created_at < ${f.until ?? new Date().toISOString()}
      ${f.destinationId ? sql`AND destination_id = ${f.destinationId}` : sql``}
    ORDER BY created_at LIMIT ${f.limit}`
}

/** Destination health for dashboards (FR-ANL-3). */
export async function deliveryHealth(sql: Sql, sinceHours: number) {
  return sql<
    {
      destination_id: string
      destination_type: string
      status: string
      n: number
      p95: number | null
    }[]
  >`
    SELECT destination_id, destination_type, status, count(*)::int AS n,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::int AS p95
    FROM cdp.destination_deliveries
    WHERE created_at >= now() - make_interval(hours => ${sinceHours})
    GROUP BY 1, 2, 3 ORDER BY 1, 3`
}
