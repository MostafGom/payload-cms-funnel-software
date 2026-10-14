'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

/** Executes a verified DSAR (export or erasure) through the collection endpoint (FR-CNS-4). */
export function DsarExecute() {
  const { id } = useDocumentInfo()
  const status = useFormFields(([f]) => f.status?.value as string | undefined)
  const type = useFormFields(([f]) => f.type?.value as string | undefined)
  const [state, setState] = useState<string | null>(null)
  if (!id) return null
  const disabled = status !== 'verified'
  return (
    <div style={{ margin: '16px 0' }}>
      <button
        type="button"
        disabled={disabled || state === 'running'}
        onClick={async () => {
          if (
            type === 'delete' &&
            !confirm('Permanently erase this person’s data? This cannot be undone.')
          )
            return
          setState('running')
          const res = await fetch(`/cms/api/dsar-requests/${id}/execute`, {
            method: 'POST',
            credentials: 'include',
          })
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setState(res.ok ? 'done, reload to see the result' : (body.error ?? 'failed'))
        }}
      >
        Execute {type === 'delete' ? 'erasure' : 'export'}
      </button>
      <p style={{ opacity: 0.7 }}>
        {disabled
          ? 'Set status to “Identity verified” (and save) before executing.'
          : (state ?? '')}
      </p>
    </div>
  )
}
