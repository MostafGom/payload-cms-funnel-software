'use client'

import { useState } from 'react'

export function PromoteWinner({
  experimentId,
  variantKey,
}: {
  experimentId: string
  variantKey: string
}) {
  const [state, setState] = useState<string | null>(null)
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`Promote "${variantKey}" to 100% and complete the experiment?`)) return
        const res = await fetch(`/api/v1/admin/experiments/${experimentId}/promote`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ variantKey }),
        })
        setState(res.ok ? 'promoted, reload to see it' : 'failed')
      }}
    >
      Promote winner “{variantKey}” {state ? `(${state})` : ''}
    </button>
  )
}
