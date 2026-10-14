import type { EmailSequenceSnapshot, SequenceTriggerPayload } from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { dueAt } from '@fp/email'
import { uuidv7 } from '@fp/platform/ids'
import type { z } from 'zod'
import type { SnapshotCache } from '../../lib/snapshots.ts'

type Trigger = z.infer<typeof SequenceTriggerPayload>['trigger']

export function matches(seq: EmailSequenceSnapshot, t: Trigger): boolean {
  if (!seq.active) return false
  if (t.type === 'manual') return seq.id === t.sequenceId
  const s = seq.trigger
  return (
    (t.type === 'form_submitted' && s.type === 'form_submitted' && s.formId === t.formId) ||
    (t.type === 'tag_added' && s.type === 'tag_added' && s.tagId === t.tagId) ||
    (t.type === 'list_joined' && s.type === 'list_joined' && s.listId === t.listId) ||
    (t.type === 'segment_entered' && s.type === 'segment_entered' && s.segmentId === t.segmentId)
  )
}

/** Enrolls a contact into every active sequence the trigger matches (FR-EML-2). Idempotent. */
export async function enrollForTrigger(
  deps: { sql: Sql; snapshots: SnapshotCache; now?: () => Date },
  contactId: string,
  trigger: Trigger,
): Promise<string[]> {
  const now = deps.now?.() ?? new Date()
  const enrolled: string[] = []
  for (const seq of await deps.snapshots.list('email_sequence')) {
    if (!matches(seq, trigger)) continue
    const first = dueAt(seq, 0, now)
    if (!first) continue
    const ok = await repos.enroll(deps.sql, {
      id: uuidv7(),
      workspaceId: 1,
      contactId,
      sequenceId: seq.id,
      nextRunAt: first.toISOString(),
      trigger: trigger as Record<string, unknown>,
    })
    if (ok) enrolled.push(seq.id)
  }
  return enrolled
}
