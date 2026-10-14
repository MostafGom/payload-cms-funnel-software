import type { SegmentSnapshot } from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { INGEST_STREAM_MAXLEN, STREAM_FIELD, STREAMS, type EnrichedEvent } from '@fp/event-schemas'
import { uuidv7 } from '@fp/platform/ids'
import { publishDeduped, type Redis } from '@fp/platform/redis'
import { membershipQuery } from '@fp/segments'
import type { SnapshotCache } from '../../lib/snapshots.ts'
import { enrollForTrigger } from '../email/enroll.ts'

export interface SegmentDeps {
  sql: Sql
  redis: Redis
  snapshots: SnapshotCache
  now?: () => Date
}

/**
 * Set-based recompute (FR-CRM-6): one statement computes the target set, inserts entries and
 * deletes exits, returning both diffs. Scales to 1M+ contacts (Phase 3 exit: < 60 s).
 */
export async function recomputeSegment(
  deps: SegmentDeps,
  seg: SegmentSnapshot,
  opts: { emitEvents?: boolean } = {},
) {
  const q = membershipQuery(seg.rules)
  const segParam = `$${q.params.length + 1}`
  const [r] = await deps.sql.unsafe<
    { entered: string[] | null; exited: string[] | null; total: number }[]
  >(
    `WITH target AS MATERIALIZED (${q.where}),
      entered AS (
        INSERT INTO cdp.segment_memberships (segment_id, contact_id)
        SELECT ${segParam}, id FROM target ON CONFLICT DO NOTHING RETURNING contact_id),
      exited AS (
        DELETE FROM cdp.segment_memberships m WHERE m.segment_id = ${segParam}
          AND NOT EXISTS (SELECT 1 FROM target t WHERE t.id = m.contact_id) RETURNING contact_id)
    SELECT (SELECT array_agg(contact_id) FROM entered) AS entered,
           (SELECT array_agg(contact_id) FROM exited) AS exited,
           (SELECT count(*)::int FROM target) AS total`,
    [...q.params, seg.id] as never[],
  )
  const entered = r?.entered ?? []
  const exited = r?.exited ?? []
  if (opts.emitEvents !== false) await emitChanges(deps, seg.id, entered, exited)
  return { entered: entered.length, exited: exited.length, total: r?.total ?? 0 }
}

/** Incremental evaluation for one changed contact (fast path from `contact.changed`). */
export async function evaluateContact(deps: SegmentDeps, contactId: string): Promise<void> {
  for (const seg of await deps.snapshots.list('segment')) {
    const q = membershipQuery(seg.rules)
    const n = q.params.length
    const [r] = await deps.sql.unsafe<{ inside: boolean }[]>(
      `SELECT EXISTS (${q.where} AND c.id = $${n + 1}::uuid) AS inside`,
      [...q.params, contactId] as never[],
    )
    if (r?.inside) {
      const ins =
        await deps.sql`INSERT INTO cdp.segment_memberships (segment_id, contact_id) VALUES (${seg.id}, ${contactId}) ON CONFLICT DO NOTHING`
      if (ins.count) await emitChanges(deps, seg.id, [contactId], [])
    } else {
      const del =
        await deps.sql`DELETE FROM cdp.segment_memberships WHERE segment_id = ${seg.id} AND contact_id = ${contactId}`
      if (del.count) await emitChanges(deps, seg.id, [], [contactId])
    }
  }
}

/** Enter/exit events into the ingest stream (timeline, webhooks) plus sequence enrol/exit. */
async function emitChanges(
  deps: SegmentDeps,
  segmentId: string,
  entered: string[],
  exited: string[],
) {
  const now = (deps.now?.() ?? new Date()).toISOString()
  const event = (name: 'segment_entered' | 'segment_exited', contactId: string): EnrichedEvent => ({
    event_id: uuidv7(),
    name,
    schema_v: 1,
    occurred_at: now,
    occurred_at_corrected: now,
    received_at: now,
    session_id: uuidv7(),
    contact_id: contactId,
    sdk_v: 'server',
    page: { url: 'https://server.invalid/segments', path: '/segments' },
    context: {},
    properties: { segment_id: segmentId },
    workspace_id: 1,
    source: 'server',
    ip: null,
    ip_trunc: null,
    user_agent: null,
    device: { type: null, os: null, browser: null },
    geo: { country: null, region: null, city: null },
    is_bot: false,
    consent_mask: 1,
    cookies: {},
  })
  const events = [
    ...entered.map((c) => event('segment_entered', c)),
    ...exited.map((c) => event('segment_exited', c)),
  ]
  for (let i = 0; i < events.length; i += 1000)
    await publishDeduped(
      deps.redis,
      { stream: STREAMS.ingest, field: STREAM_FIELD, maxLen: INGEST_STREAM_MAXLEN },
      events.slice(i, i + 1000),
    )
  for (const c of entered) await enrollForTrigger(deps, c, { type: 'segment_entered', segmentId })
  if (exited.length) {
    const seqs = (await deps.snapshots.list('email_sequence'))
      .filter((s) => s.exit.segmentId === segmentId)
      .map((s) => s.id)
    if (seqs.length)
      for (const c of exited) await repos.exitEnrollments(deps.sql, c, 'left_segment', seqs)
  }
}
