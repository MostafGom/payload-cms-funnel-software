import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { evaluateFlag, type Flag } from './flag-eval'

export const FLAGS_TAG = 'feature-flags'

const loadFlags = unstable_cache(
  async (): Promise<Flag[]> => {
    const payload = await getPayload({ config })
    const g = await payload.findGlobal({ slug: 'feature-flags', depth: 0 })
    return (g.flags ?? []).map((f) => ({
      key: f.key,
      enabled: !!f.enabled,
      rolloutPercent: f.rolloutPercent ?? 100,
    }))
  },
  ['feature-flags'],
  { tags: [FLAGS_TAG], revalidate: 60 },
)

export async function isEnabled(key: string, subject?: string): Promise<boolean> {
  return evaluateFlag(await loadFlags(), key, subject)
}
