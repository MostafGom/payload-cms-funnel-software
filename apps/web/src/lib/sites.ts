import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { domainTag, pageTag } from '@/cms/hooks/revalidate'
import type { Page } from '@/payload-types'

/** "/" maps to the domain's home page; otherwise the path is the slug. */
export const slugFromSegments = (segments: string[] | undefined): string | null =>
  segments?.length ? segments.map(decodeURIComponent).join('/') : null

/**
 * Resolves the published page for host + slug. Cached and tagged so publishing a page or editing
 * a domain revalidates exactly what changed (ADR-0015).
 */
export function getPublishedPage(hostname: string, slug: string | null): Promise<Page | null> {
  const key = slug ?? '__home__'
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      const domains = await payload.find({
        collection: 'domains',
        where: { hostname: { equals: hostname }, active: { equals: true } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const domain = domains.docs[0]
      if (!domain) return null

      if (slug === null) {
        if (!domain.homePage) return null
        const id = typeof domain.homePage === 'object' ? domain.homePage.id : domain.homePage
        const home = await payload.find({
          collection: 'pages',
          where: { id: { equals: id }, _status: { equals: 'published' } },
          limit: 1,
          depth: 1,
        })
        return home.docs[0] ?? null
      }

      const pages = await payload.find({
        collection: 'pages',
        where: {
          domain: { equals: domain.id },
          slug: { equals: slug },
          _status: { equals: 'published' },
        },
        limit: 1,
        depth: 1,
      })
      return pages.docs[0] ?? null
    },
    ['site-page', hostname, key],
    { tags: [pageTag(hostname, key), domainTag(hostname)], revalidate: 3600 },
  )()
}

/** Draft (latest version) for live preview; never cached. */
export async function getDraftPage(hostname: string, slug: string | null): Promise<Page | null> {
  const payload = await getPayload({ config })
  const domains = await payload.find({
    collection: 'domains',
    where: { hostname: { equals: hostname } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const domain = domains.docs[0]
  if (!domain) return null
  if (slug === null && domain.homePage) {
    const id = typeof domain.homePage === 'object' ? domain.homePage.id : domain.homePage
    return payload
      .findByID({ collection: 'pages', id, draft: true, depth: 1, overrideAccess: true })
      .catch(() => null)
  }
  const pages = await payload.find({
    collection: 'pages',
    where: { domain: { equals: domain.id }, slug: { equals: slug ?? 'home' } },
    draft: true,
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return pages.docs[0] ?? null
}
