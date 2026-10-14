'use client'

import { useState } from 'react'

/** Calls the admin replay API (FR-DST-7); auth is the admin session cookie. */
export function ReplayButton({ label, body }: { label: string; body: Record<string, unknown> }) {
  const [state, setState] = useState<string | null>(null)
  return (
    <button
      type="button"
      disabled={state === '…'}
      onClick={async () => {
        setState('…')
        const res = await fetch('/api/v1/admin/deliveries/replay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json().catch(() => ({}))) as { replayed?: number; error?: string }
        setState(res.ok ? `queued ${json.replayed ?? 0}` : (json.error ?? 'failed'))
      }}
    >
      {label} {state && state !== '…' ? `(${state})` : null}
    </button>
  )
}
