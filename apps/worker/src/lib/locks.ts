import type { Sql } from '@fp/db'

/**
 * Runs `fn` only if this process wins a session-level advisory lock, so scheduler jobs run once
 * even with several scheduler replicas (ADR-0019). Uses a dedicated reserved connection.
 */
export async function withAdvisoryLock<T>(
  sql: Sql,
  key: number,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const conn = await sql.reserve()
  try {
    const [r] = await conn<{ ok: boolean }[]>`SELECT pg_try_advisory_lock(${key}) AS ok`
    if (!r?.ok) return undefined
    try {
      return await fn()
    } finally {
      await conn`SELECT pg_advisory_unlock(${key})`
    }
  } finally {
    conn.release()
  }
}

/** Runs `tick` every `everyMs` until aborted; errors are reported, never fatal. */
export function every(
  everyMs: number,
  signal: AbortSignal,
  tick: () => Promise<unknown>,
  onError: (e: unknown) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let running = false
    const run = () => {
      if (running || signal.aborted) return
      running = true
      tick()
        .catch(onError)
        .finally(() => (running = false))
    }
    run()
    const t = setInterval(run, everyMs)
    signal.addEventListener('abort', () => {
      clearInterval(t)
      resolve()
    })
  })
}
