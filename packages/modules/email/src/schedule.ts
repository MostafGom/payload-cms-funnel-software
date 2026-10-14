import type { EmailSequenceSnapshot, SendWindow } from '@fp/contracts'

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

/** Local wall-clock parts in a timezone (no dependencies; Intl is in every runtime). */
function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]))
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday!) + 1
  return { weekday, hour: Number(p.hour), minute: Number(p.minute) }
}

/**
 * Earliest instant >= `at` inside the send window (FR-EML-2). Steps forward in 15-minute
 * increments, which is exact for whole-hour windows and robust across DST changes.
 */
export function nextInWindow(at: Date, w: SendWindow | undefined): Date {
  if (!w) return at
  let t = new Date(at)
  for (let i = 0; i < 4 * 24 * 8; i++) {
    const { weekday, hour } = localParts(t, w.timezone)
    if (w.days.includes(weekday) && hour >= w.startHour && hour < w.endHour) return t
    const { minute } = localParts(t, w.timezone)
    t = new Date(t.getTime() + (15 - (minute % 15)) * 60_000 - (t.getTime() % 60_000))
  }
  return at // window never open (misconfigured): send rather than stall forever
}

/** When step `index` is due, measured from the previous step (or enrollment) time. */
export function dueAt(seq: EmailSequenceSnapshot, index: number, from: Date): Date | null {
  const step = seq.steps[index]
  if (!step) return null
  return nextInWindow(
    new Date(from.getTime() + step.delayAmount * UNIT_MS[step.delayUnit]),
    seq.window,
  )
}

/** How long a sequence waits for a double opt-in confirmation before giving up. */
export const CONFIRMATION_GRACE_MS = 7 * 86_400_000

export type SequenceDecision =
  | { action: 'send'; stepIndex: number; templateId: string; nextRunAt: Date | null }
  | { action: 'wait'; until: Date }
  | { action: 'exit'; reason: string }
  | { action: 'complete' }

/**
 * Decides what a due enrollment does now. Exit conditions win over sending (FR-EML-2):
 * unsubscribed/suppressed, an exit tag present, or an exit event performed since enrollment.
 */
export function decideStep(input: {
  seq: EmailSequenceSnapshot
  currentStep: number
  now: Date
  contact: { marketingStatus: string; status: string; tagIds: string[]; suppressed: boolean }
  exitEventSeen: boolean
  inExitSegment?: boolean
  enrolledAt?: Date
}): SequenceDecision {
  const { seq, contact } = input
  if (!seq.active) return { action: 'exit', reason: 'sequence_inactive' }
  if (contact.status !== 'active') return { action: 'exit', reason: 'contact_inactive' }
  if (contact.suppressed) return { action: 'exit', reason: 'suppressed' }
  // Pending double opt-in: hold the sequence until confirmed (or the grace period ends).
  if (
    contact.marketingStatus === 'unconfirmed' &&
    input.enrolledAt &&
    input.now.getTime() - input.enrolledAt.getTime() < CONFIRMATION_GRACE_MS
  )
    return { action: 'wait', until: new Date(input.now.getTime() + 3_600_000) }
  if (contact.marketingStatus !== 'subscribed') return { action: 'exit', reason: 'not_subscribed' }
  if (seq.exit.tagIds.some((t) => contact.tagIds.includes(t)))
    return { action: 'exit', reason: 'exit_tag' }
  if (input.exitEventSeen) return { action: 'exit', reason: 'exit_event' }
  if (seq.exit.segmentId && input.inExitSegment === false)
    return { action: 'exit', reason: 'left_segment' }
  const step = seq.steps[input.currentStep]
  if (!step) return { action: 'complete' }
  return {
    action: 'send',
    stepIndex: input.currentStep,
    templateId: step.templateId,
    nextRunAt: dueAt(seq, input.currentStep + 1, input.now),
  }
}
