'use client'

import { useState } from 'react'

export function MergeButtons({ a, b }: { a: string; b: string }) {
  const [done, setDone] = useState<string | null>(null)
  const act = async (action: 'merge_into_a' | 'merge_into_b' | 'dismiss') => {
    if (action !== 'dismiss' && !confirm('Merge these contacts? This cannot be undone.')) return
    const res = await fetch('/api/v1/admin/contacts/merge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a, b, action }),
    })
    setDone(res.ok ? action : 'error')
  }
  if (done) return <span>{done}</span>
  return (
    <span style={{ display: 'flex', gap: 6 }}>
      <button type="button" onClick={() => act('merge_into_a')}>
        Keep A
      </button>
      <button type="button" onClick={() => act('merge_into_b')}>
        Keep B
      </button>
      <button type="button" onClick={() => act('dismiss')}>
        Not a duplicate
      </button>
    </span>
  )
}
