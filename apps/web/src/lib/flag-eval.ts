import { bucket } from '@fp/experiments'

export interface Flag {
  key: string
  enabled: boolean
  rolloutPercent: number
}

/** Pure evaluation: unknown flags are off; rollout buckets are stable per subject (ADR-0023). */
export function evaluateFlag(flags: Flag[], key: string, subject?: string): boolean {
  const f = flags.find((x) => x.key === key)
  if (!f?.enabled) return false
  if (f.rolloutPercent >= 100) return true
  if (!subject) return false
  return bucket(`flag:${key}`, subject) * 100 < f.rolloutPercent
}
