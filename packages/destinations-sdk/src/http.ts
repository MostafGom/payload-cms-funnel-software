import type { Classification } from './types.ts'

/**
 * Shared HTTP classification (ADR-0010): 2xx success; 408/425/429 and 5xx retry (honouring
 * Retry-After); other 4xx are permanent (bad token, invalid payload) and go to `failed`.
 */
export function classifyHttp(status: number, headers: Headers): Classification {
  if (status >= 200 && status < 300) return { outcome: 'success' }
  const retryAfter = parseRetryAfter(headers.get('retry-after'))
  if (status === 408 || status === 425 || status === 429 || status >= 500 || status === 0)
    return { outcome: 'retry', reason: `http_${status}`, retryAfterMs: retryAfter }
  return { outcome: 'fatal', reason: `http_${status}` }
}

export function parseRetryAfter(v: string | null): number | undefined {
  if (!v) return undefined
  const secs = Number(v)
  if (Number.isFinite(secs)) return Math.min(secs, 3600) * 1000
  const at = Date.parse(v)
  return Number.isFinite(at) ? Math.max(0, Math.min(at - Date.now(), 3_600_000)) : undefined
}

/**
 * Retry schedule (FR-DST-7): exponential with full jitter, capped at 2h per wait, abandoned once
 * the event is older than 72h. Returns null when the delivery should be marked dead.
 */
export const RETRY_HORIZON_MS = 72 * 3600 * 1000

export function nextRetryDelay(
  attempt: number,
  eventAgeMs: number,
  retryAfterMs?: number,
  rand = Math.random,
): number | null {
  if (eventAgeMs >= RETRY_HORIZON_MS) return null
  const base = Math.min(2 * 3600 * 1000, 15_000 * 2 ** Math.max(0, attempt - 1))
  const delay = Math.max(retryAfterMs ?? 0, Math.round(base / 2 + rand() * (base / 2)))
  return eventAgeMs + delay > RETRY_HORIZON_MS
    ? Math.max(0, RETRY_HORIZON_MS - eventAgeMs) || null
    : delay
}

/** Unix seconds. */
export const unix = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000)
