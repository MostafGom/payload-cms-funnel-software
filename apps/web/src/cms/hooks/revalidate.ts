import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook } from 'payload'

/** Cache tags shared by the site renderer and these hooks (ADR-0015). */
export const pageTag = (hostname: string, slug: string) => `page:${hostname}:${slug}`
export const domainTag = (hostname: string) => `domain:${hostname}`

const safeRevalidate = (tag: string) => {
  try {
    revalidateTag(tag, 'max')
  } catch {
    // Outside a Next request context (CLI, migrations, seeds) there is no cache to revalidate.
  }
}

export const revalidateTagSafe = (tag: string): void => safeRevalidate(tag)

export const revalidateDomain: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  if (previousDoc?.hostname && previousDoc.hostname !== doc.hostname)
    safeRevalidate(domainTag(previousDoc.hostname))
  safeRevalidate(domainTag(doc.hostname))
  return doc
}

export const revalidatePage: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc._status !== 'published' || !doc.domain) return doc
  const domainId = typeof doc.domain === 'object' ? doc.domain.id : doc.domain
  const domain = await req.payload.findByID({ collection: 'domains', id: domainId, depth: 0, req })
  safeRevalidate(pageTag(domain.hostname, doc.slug))
  safeRevalidate(domainTag(domain.hostname))
  return doc
}

/** Tag on every rendered site page: pixel config, consent texts, tracking settings. */
export const SITE_CONFIG_TAG = 'site-config'
export const funnelTag = (pageId: string) => `funnel-page:${pageId}`

export const revalidateAllSites = ({ doc }: { doc: unknown }) => {
  safeRevalidate(SITE_CONFIG_TAG)
  return doc
}

export const revalidateFunnel: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const pages = new Set<string>()
  for (const s of [...(doc.steps ?? []), ...(previousDoc?.steps ?? [])]) {
    const id = typeof s.page === 'object' ? s.page?.id : s.page
    if (id) pages.add(String(id))
  }
  for (const id of pages) safeRevalidate(funnelTag(id))
  return doc
}
