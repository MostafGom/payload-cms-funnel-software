'use client'

import { useSyncExternalStore } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

// One shared 1 Hz clock; the server snapshot is null so SSR renders a stable placeholder.
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 1000)
  return () => clearInterval(t)
}
const nowSeconds = () => Math.floor(Date.now() / 1000)
const serverSnapshot = () => null

/** Real deadline only (no fake evergreen timers). No layout shift: fixed-width placeholder (CLS < 0.1). */
export function CountdownClock({
  label,
  endsAt,
  expiredText,
}: {
  label: string
  endsAt: string
  expiredText: string
}) {
  const end = new Date(endsAt).getTime()
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot)
  if (now !== null && now * 1000 >= end) return <p>{expiredText}</p>
  const left = Math.max(0, end - (now ?? 0) * 1000)
  const d = Math.floor(left / 86_400_000)
  const h = Math.floor(left / 3_600_000) % 24
  const m = Math.floor(left / 60_000) % 60
  const s = Math.floor(left / 1000) % 60
  return (
    <p className="countdown" aria-live="off">
      <span>{label}</span>{' '}
      <time dateTime={endsAt} suppressHydrationWarning>
        {now === null ? '--:--:--' : `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`}
      </time>
    </p>
  )
}
