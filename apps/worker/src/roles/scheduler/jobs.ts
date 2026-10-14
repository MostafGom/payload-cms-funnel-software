import { createHash } from 'node:crypto'
import {
  dropDailyPartitionsBefore,
  ensureDailyPartitions,
  PARTITIONED_DAILY,
  repos,
  type Sql,
} from '@fp/db'
import { decideStep } from '@fp/email'
import type { Logger } from '@fp/platform/logger'
import type { Meter } from '@fp/platform/otel'
import type { Redis } from '@fp/platform/redis'
import type { Queues } from '../../lib/queues.ts'
import type { SnapshotCache } from '../../lib/snapshots.ts'
import { recomputeSegment } from '../segments/compute.ts'

export interface SchedulerDeps {
  sql: Sql
  redis: Redis
  queues: Queues
  snapshots: SnapshotCache
  logger: Logger
  meter: Meter
  /** injectable clock: the sequence "time-travel" test drives this (Phase 3 exit criterion) */
  now?: () => Date
}
const nowOf = (d: SchedulerDeps) => d.now?.() ?? new Date()

/** ADR-0012 retention policy, in days. */
export const RETENTION_DAYS = {
  events: 395, // 13 months
  destination_deliveries: 90,
  sessions: 395,
  funnel_journeys: 395,
  email_messages: 730,
  audit_logs: 730,
  consent_records: 5 * 365,
  rollups: 25 * 31,
  outbox_published: 7,
} as const

export async function maintainPartitions(d: SchedulerDeps): Promise<void> {
  for (const table of PARTITIONED_DAILY) {
    const created = await ensureDailyPartitions(d.sql, table, { from: nowOf(d) })
    if (created.length) d.logger.info({ table, created }, 'partitions created')
  }
}

const daysAgo = (d: SchedulerDeps, n: number) => new Date(nowOf(d).getTime() - n * 86_400_000)

export async function applyRetention(d: SchedulerDeps): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  out.events = (
    await dropDailyPartitionsBefore(d.sql, 'events', daysAgo(d, RETENTION_DAYS.events))
  ).length
  out.deliveries = (
    await dropDailyPartitionsBefore(
      d.sql,
      'destination_deliveries',
      daysAgo(d, RETENTION_DAYS.destination_deliveries),
    )
  ).length
  out.sessions = (
    await d.sql`DELETE FROM cdp.sessions WHERE last_seen_at < ${daysAgo(d, RETENTION_DAYS.sessions).toISOString()}`
  ).count
  out.journeys = (
    await d.sql`DELETE FROM cdp.funnel_journeys WHERE last_at < ${daysAgo(d, RETENTION_DAYS.funnel_journeys).toISOString()}`
  ).count
  out.emails = (
    await d.sql`DELETE FROM cdp.email_messages WHERE created_at < ${daysAgo(d, RETENTION_DAYS.email_messages).toISOString()}`
  ).count
  out.audit = (
    await d.sql`DELETE FROM cdp.audit_logs WHERE at < ${daysAgo(d, RETENTION_DAYS.audit_logs).toISOString()}`
  ).count
  out.rollups = (
    await d.sql`DELETE FROM cdp.agg_events_daily WHERE day < ${daysAgo(d, RETENTION_DAYS.rollups).toISOString()}`
  ).count
  out.consent = (await d.sql.begin(async (tx) => {
    await tx`SELECT set_config('fp.consent_retention', 'on', true)`
    return (
      await tx`DELETE FROM cdp.consent_records WHERE recorded_at < ${daysAgo(d, RETENTION_DAYS.consent_records).toISOString()}`
    ).count
  })) as number
  out.outbox = await repos.purgePublishedOutbox(d.sql, RETENTION_DAYS.outbox_published)
  d.logger.info(out, 'retention applied')
  return out
}

/** Idempotent daily rollup rebuild for today and yesterday (ADR-0017). */
export async function rebuildRollups(d: SchedulerDeps): Promise<void> {
  for (const offset of [1, 0]) {
    const day = daysAgo(d, offset).toISOString().slice(0, 10)
    await d.sql.begin(async (tx) => {
      await tx`DELETE FROM cdp.agg_events_daily WHERE day = ${day}`
      await tx`
        INSERT INTO cdp.agg_events_daily (workspace_id, day, name, funnel_id, step_id, variant_key, utm_source, utm_medium, utm_campaign, events, visitors)
        SELECT workspace_id, ${day}::date, name, coalesce(funnel_id, ''), coalesce(step_id, ''), coalesce(variant_key, ''),
          coalesce(utm_source, ''), coalesce(utm_medium, ''), coalesce(utm_campaign, ''),
          count(*)::int, count(DISTINCT coalesce(anonymous_id, session_id))::int
        FROM cdp.events
        WHERE received_at >= ${day}::date AND received_at < ${day}::date + 1 AND NOT is_bot
        GROUP BY 1, 3, 4, 5, 6, 7, 8, 9`
    })
  }
  await d.sql`
    INSERT INTO cdp.agg_delivery_hourly (workspace_id, hour, destination_id, status, deliveries, p95_latency_ms)
    SELECT workspace_id, date_trunc('hour', created_at), destination_id, status, count(*)::int,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::int
    FROM cdp.destination_deliveries WHERE created_at >= date_trunc('hour', ${nowOf(d).toISOString()}::timestamptz) - interval '2 hours'
    GROUP BY 1, 2, 3, 4
    ON CONFLICT (workspace_id, hour, destination_id, status) DO UPDATE
      SET deliveries = EXCLUDED.deliveries, p95_latency_ms = EXCLUDED.p95_latency_ms`
}

/** Deterministic UUID per (enrollment, step) so a re-run can never send a step twice. */
export function stepMessageId(enrollmentId: string, step: number): string {
  const h = createHash('sha256').update(`${enrollmentId}:${step}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

/** Sequence engine tick (FR-EML-2): due enrollments -> send / wait / exit / complete. */
export async function runSequences(d: SchedulerDeps, limit = 500): Promise<Record<string, number>> {
  const now = nowOf(d)
  const counts: Record<string, number> = { send: 0, wait: 0, exit: 0, complete: 0 }
  const sends: Parameters<Queues['enqueueEmail']>[0][] = []
  await repos.withDueEnrollments(d.sql, now.toISOString(), limit, async (rows, tx) => {
    const contacts = await repos.getContacts(
      tx,
      rows.map((r) => r.contact_id),
    )
    for (const e of rows) {
      const seq = await d.snapshots.get('email_sequence', e.sequence_id)
      const c = contacts.get(e.contact_id)
      if (!seq || !c) {
        await repos.advanceEnrollment(tx, e.id, {
          currentStep: e.current_step,
          nextRunAt: null,
          status: 'exited',
          exitReason: seq ? 'contact_missing' : 'sequence_deleted',
        })
        counts.exit!++
        continue
      }
      const suppressed = c.email_hash ? !!(await repos.isSuppressed(tx, 1, c.email_hash)) : true
      const inExitSegment = seq.exit.segmentId
        ? (
            await tx`SELECT 1 FROM cdp.segment_memberships WHERE segment_id = ${seq.exit.segmentId} AND contact_id = ${c.id}`
          ).count > 0
        : undefined
      const decision = decideStep({
        seq,
        currentStep: e.current_step,
        now,
        contact: {
          marketingStatus: c.marketing_status,
          status: c.status,
          tagIds: c.tag_ids,
          suppressed,
        },
        exitEventSeen: false, // handled at ingest time, as events arrive
        inExitSegment,
        enrolledAt: new Date(e.enrolled_at),
      })
      counts[decision.action]!++
      if (decision.action === 'send') {
        sends.push({
          kind: 'sequence',
          contactId: c.id,
          templateId: decision.templateId,
          enrollmentId: e.id,
          sequenceId: seq.id,
          stepIndex: decision.stepIndex,
          messageId: stepMessageId(e.id, decision.stepIndex),
        })
        await repos.advanceEnrollment(tx, e.id, {
          currentStep: e.current_step + 1,
          nextRunAt: decision.nextRunAt?.toISOString() ?? null,
          status: decision.nextRunAt ? 'active' : 'completed',
        })
      } else if (decision.action === 'wait') {
        await repos.advanceEnrollment(tx, e.id, {
          currentStep: e.current_step,
          nextRunAt: decision.until.toISOString(),
        })
      } else if (decision.action === 'exit') {
        await repos.advanceEnrollment(tx, e.id, {
          currentStep: e.current_step,
          nextRunAt: null,
          status: 'exited',
          exitReason: decision.reason,
        })
      } else {
        await repos.advanceEnrollment(tx, e.id, {
          currentStep: e.current_step,
          nextRunAt: null,
          status: 'completed',
        })
      }
    }
  })
  // After commit: BullMQ jobIds equal message ids, so a crash between commit and enqueue is
  // recovered by the next tick's sweeper without duplicates.
  for (const s of sends) await d.queues.enqueueEmail(s)
  return counts
}

/** Recompute segments whose interval elapsed (FR-CRM-6). */
export async function runSegments(d: SchedulerDeps): Promise<void> {
  const now = nowOf(d).getTime()
  for (const seg of await d.snapshots.list('segment')) {
    const key = `seg:last:${seg.id}`
    const last = Number((await d.redis.get(key)) ?? 0)
    if (now - last < seg.recomputeMinutes * 60_000) continue
    const started = Date.now()
    const first =
      last === 0 &&
      (await d.sql`SELECT 1 FROM cdp.segment_memberships WHERE segment_id = ${seg.id} LIMIT 1`)
        .count === 0
    // The very first computation is a backfill: no enter events / sequence enrolments for history.
    const r = await recomputeSegment(d, seg, { emitEvents: !first })
    await d.redis.set(key, String(now), 'EX', 7 * 86_400)
    d.logger.info({ segmentId: seg.id, ...r, ms: Date.now() - started }, 'segment recomputed')
  }
}

/** Re-drive deliveries whose job was lost (crash between commit and enqueue, Valkey restart). */
export async function sweepDeliveries(d: SchedulerDeps): Promise<number> {
  const rows = await d.sql<
    { delivery_id: string; created_at: string; destination_id: string; event_id: string }[]
  >`
    SELECT delivery_id, created_at, destination_id, event_id FROM cdp.destination_deliveries
    WHERE created_at >= now() - interval '73 hours'
      AND ((status = 'pending' AND updated_at < now() - interval '2 minutes')
        OR (status = 'retrying' AND updated_at < now() - interval '3 hours'))
    LIMIT 1000`
  if (rows.length)
    await d.queues.enqueueDeliveries(
      rows.map((r) => ({
        deliveryId: r.delivery_id,
        createdAt: new Date(r.created_at).toISOString(),
        destinationId: r.destination_id,
        eventId: r.event_id,
      })),
    )
  return rows.length
}

/** DSAR deadlines (FR-CNS-4): warn when due within 5 days or overdue. Reads the CMS read model. */
export async function checkDsarDeadlines(
  d: SchedulerDeps,
): Promise<{ dueSoon: number; overdue: number }> {
  const [r] = await d.sql<{ due_soon: number; overdue: number }[]>`
    SELECT count(*) FILTER (WHERE due_at < now())::int AS overdue,
           count(*) FILTER (WHERE due_at >= now() AND due_at < now() + interval '5 days')::int AS due_soon
    FROM cms.dsar_requests WHERE status::text IN ('received', 'verified')`
  const res = { dueSoon: r?.due_soon ?? 0, overdue: r?.overdue ?? 0 }
  if (res.overdue) d.logger.error(res, 'DSAR requests overdue')
  else if (res.dueSoon) d.logger.warn(res, 'DSAR requests due within 5 days')
  return res
}

/**
 * Nightly reconciliation (Phase 1B exit criterion): accepted submissions vs stored server
 * conversions vs deliveries per destination for yesterday. Gaps are logged as errors.
 */
export async function reconcile(d: SchedulerDeps): Promise<Record<string, number>> {
  const day = daysAgo(d, 1).toISOString().slice(0, 10)
  const [s] = await d.sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM cms.form_submissions
    WHERE status = 'accepted' AND created_at >= ${day}::date AND created_at < ${day}::date + 1`
  const [e] = await d.sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM cdp.events
    WHERE name = 'form_submitted' AND source = 'server' AND received_at >= ${day}::date AND received_at < ${day}::date + 1`
  const deliveries = await d.sql<{ destination_id: string; n: number; missing: number }[]>`
    SELECT d.destination_id, count(*)::int AS n,
      count(*) FILTER (WHERE d.status IN ('pending', 'retrying', 'failed', 'dead'))::int AS missing
    FROM cdp.destination_deliveries d
    -- erased people keep pseudonymised delivery rows but lose their events: compare like with like
    JOIN cdp.events e ON e.event_id = d.event_id AND e.received_at = d.created_at AND e.source = 'server'
    WHERE d.event_name = 'form_submitted' AND d.created_at >= ${day}::date AND d.created_at < ${day}::date + 1
    GROUP BY 1`
  const out: Record<string, number> = { submissions: s?.n ?? 0, serverEvents: e?.n ?? 0 }
  for (const r of deliveries) {
    out[`deliveries:${r.destination_id}`] = r.n
    out[`undelivered:${r.destination_id}`] = r.missing
  }
  const gap =
    out.submissions !== out.serverEvents ||
    deliveries.some((r) => r.n !== out.serverEvents || r.missing > 0)
  if (gap) d.logger.error({ day, ...out }, 'reconciliation gap')
  else d.logger.info({ day, ...out }, 'reconciliation ok')
  return out
}
