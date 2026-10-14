import { unstable_cache } from 'next/cache'
import { FormSnapshot } from '@fp/contracts'
import { repos } from '@fp/db'
import { cdp } from './cdp'

export const formTag = (id: string) => `form:${id}`

/** Published form as validated by the API (ADR-0025): render and validation never drift. */
export function getFormSnapshot(id: string): Promise<FormSnapshot | null> {
  return unstable_cache(
    async () => {
      const row = await repos.getSnapshot(cdp().sql, 'form', id)
      if (!row) return null
      const parsed = FormSnapshot.safeParse(row.data)
      return parsed.success ? parsed.data : null
    },
    ['form-snapshot', id],
    { tags: [formTag(id)], revalidate: 300 },
  )()
}

/** Uncached read for the submission API (must see a publish immediately). */
export async function loadFormSnapshotFresh(id: string): Promise<FormSnapshot | null> {
  const row = await repos.getSnapshot(cdp().sql, 'form', id)
  if (!row) return null
  const parsed = FormSnapshot.safeParse(row.data)
  return parsed.success ? parsed.data : null
}
