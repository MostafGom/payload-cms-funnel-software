import type { Sql } from '../client.ts'

export async function isSuppressed(sql: Sql, workspaceId: number, emailHash: string) {
  const [r] = await sql<{ reason: string }[]>`
    SELECT reason FROM cdp.email_suppressions
    WHERE workspace_id = ${workspaceId} AND email_hash = ${emailHash}`
  return r?.reason ?? null
}

export async function suppress(
  sql: Sql,
  s: {
    workspaceId: number
    emailHash: string
    reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual' | 'erasure'
    detail?: string
  },
): Promise<void> {
  await sql`
    INSERT INTO cdp.email_suppressions (workspace_id, email_hash, reason, detail)
    VALUES (${s.workspaceId}, ${s.emailHash}, ${s.reason}, ${s.detail ?? null})
    ON CONFLICT (workspace_id, email_hash) DO NOTHING`
}

export async function unsuppress(sql: Sql, workspaceId: number, emailHash: string) {
  await sql`
    DELETE FROM cdp.email_suppressions
    WHERE workspace_id = ${workspaceId} AND email_hash = ${emailHash} AND reason IN ('unsubscribe', 'manual')`
}

export interface EmailMessageInsert {
  id: string
  workspaceId: number
  contactId: string
  kind: 'transactional' | 'double_opt_in' | 'sequence' | 'broadcast'
  templateId: string | null
  sequenceId?: string | null
  enrollmentId?: string | null
  stepIndex?: number | null
  toHash: string
  subject: string | null
  provider: string | null
  status: 'queued' | 'sent' | 'failed' | 'suppressed'
}

/** Returns false when this enrollment step was already recorded (idempotent send). */
export async function insertEmailMessage(sql: Sql, m: EmailMessageInsert): Promise<boolean> {
  const r = await sql`
    INSERT INTO cdp.email_messages (id, workspace_id, contact_id, kind, template_id, sequence_id,
      enrollment_id, step_index, to_hash, subject, provider, status)
    VALUES (${m.id}, ${m.workspaceId}, ${m.contactId}, ${m.kind}, ${m.templateId},
      ${m.sequenceId ?? null}, ${m.enrollmentId ?? null}, ${m.stepIndex ?? null}, ${m.toHash},
      ${m.subject}, ${m.provider}, ${m.status})
    ON CONFLICT DO NOTHING`
  return r.count === 1
}

export async function updateEmailMessage(
  sql: Sql,
  id: string,
  u: { status: string; providerMessageId?: string | null; error?: string | null; sent?: boolean },
): Promise<void> {
  await sql`
    UPDATE cdp.email_messages SET status = ${u.status},
      provider_message_id = COALESCE(${u.providerMessageId ?? null}, provider_message_id),
      error = ${u.error ?? null}, sent_at = CASE WHEN ${u.sent ?? false} THEN now() ELSE sent_at END,
      updated_at = now()
    WHERE id = ${id}`
}

/** Applies a provider webhook (bounce, complaint, delivery) by provider message id. */
export async function emailStatusByProviderId(
  sql: Sql,
  provider: string,
  providerMessageId: string,
  status: string,
): Promise<{ contact_id: string; to_hash: string; workspace_id: number } | null> {
  const [r] = await sql<{ contact_id: string; to_hash: string; workspace_id: number }[]>`
    UPDATE cdp.email_messages SET status = ${status}, updated_at = now()
    WHERE provider = ${provider} AND provider_message_id = ${providerMessageId}
    RETURNING contact_id, to_hash, workspace_id`
  return r ?? null
}

export interface EnrollmentRow {
  id: string
  workspace_id: number
  contact_id: string
  sequence_id: string
  status: 'active' | 'completed' | 'exited' | 'paused'
  current_step: number
  next_run_at: string | null
  enrolled_at: string
}

export async function enroll(
  sql: Sql,
  e: {
    id: string
    workspaceId: number
    contactId: string
    sequenceId: string
    nextRunAt: string
    trigger: Record<string, unknown>
  },
): Promise<boolean> {
  const r = await sql`
    INSERT INTO cdp.email_enrollments (id, workspace_id, contact_id, sequence_id, status, next_run_at, trigger)
    VALUES (${e.id}, ${e.workspaceId}, ${e.contactId}, ${e.sequenceId}, 'active', ${e.nextRunAt}, ${JSON.stringify(e.trigger)}::text::jsonb)
    ON CONFLICT DO NOTHING`
  return r.count === 1
}

/** Locks due enrollments for this tick (SKIP LOCKED: several schedulers can run). */
export async function withDueEnrollments<T>(
  sql: Sql,
  now: string,
  limit: number,
  fn: (rows: EnrollmentRow[], tx: Sql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    const rows = await tx<EnrollmentRow[]>`
      SELECT id, workspace_id, contact_id, sequence_id, status, current_step, next_run_at, enrolled_at
      FROM cdp.email_enrollments
      WHERE status = 'active' AND next_run_at <= ${now}
      ORDER BY next_run_at LIMIT ${limit} FOR UPDATE SKIP LOCKED`
    return fn(rows, tx as unknown as Sql)
  }) as Promise<T>
}

export async function advanceEnrollment(
  sql: Sql,
  id: string,
  u: {
    currentStep: number
    nextRunAt: string | null
    status?: 'active' | 'completed' | 'exited'
    exitReason?: string
  },
): Promise<void> {
  const status = u.status ?? 'active'
  await sql`
    UPDATE cdp.email_enrollments SET current_step = ${u.currentStep}, next_run_at = ${u.nextRunAt},
      status = ${status}, exit_reason = ${u.exitReason ?? null},
      finished_at = CASE WHEN ${status} IN ('completed', 'exited') THEN now() ELSE NULL END
    WHERE id = ${id}`
}

export async function exitEnrollments(
  sql: Sql,
  contactId: string,
  reason: string,
  sequenceIds?: string[],
): Promise<number> {
  const r = await sql`
    UPDATE cdp.email_enrollments SET status = 'exited', exit_reason = ${reason}, finished_at = now(), next_run_at = NULL
    WHERE contact_id = ${contactId} AND status IN ('active', 'paused')
      ${sequenceIds ? sql`AND sequence_id = ANY(${sequenceIds})` : sql``}`
  return r.count
}
