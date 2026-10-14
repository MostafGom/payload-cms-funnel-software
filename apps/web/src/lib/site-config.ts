import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DestinationSnapshot } from '@fp/contracts'
import { repos } from '@fp/db'
import { funnelTag, SITE_CONFIG_TAG } from '@/cms/hooks/revalidate'
import { cdp } from './cdp'

export interface PixelConfig {
  type: 'meta' | 'tiktok' | 'snap'
  id: string
  /** our event name -> platform event name, for browser conversions */
  events: Record<string, string>
}

export interface SiteConfig {
  siteKey: string
  sdk: {
    autocaptureClicks: boolean
    scrollDepth: boolean
    trackForms: boolean
    spaPageviews: boolean
    sessionTimeoutMinutes: number
    debug: boolean
  }
  consent: {
    policyVersion: string
    bannerVersion: string
    title: string
    body: string
    acceptLabel: string
    rejectLabel: string
    manageLabel: string
    privacyPolicyUrl: string
  }
  pixels: PixelConfig[]
}

/** Everything the SDK and banner need, cached and revalidated by SITE_CONFIG_TAG. */
export const getSiteConfig = unstable_cache(
  async (): Promise<SiteConfig> => {
    const payload = await getPayload({ config })
    const [tracking, consent, dests] = await Promise.all([
      payload.findGlobal({ slug: 'tracking-settings', depth: 0 }),
      payload.findGlobal({ slug: 'consent-settings', depth: 0 }),
      repos.listSnapshots(cdp().sql, 'destination'),
    ])
    const pixels: PixelConfig[] = []
    for (const row of dests) {
      const d = DestinationSnapshot.safeParse(row.data)
      if (
        !d.success ||
        !d.data.enabled ||
        !d.data.browserPixel ||
        !d.data.pixelId ||
        d.data.type === 'webhook'
      )
        continue
      pixels.push({
        type: d.data.type,
        id: d.data.pixelId,
        events: Object.fromEntries(
          d.data.eventMap.filter((m) => m.enabled).map((m) => [m.source, m.target]),
        ),
      })
    }
    return {
      siteKey: tracking.siteKey ?? 'dev-site',
      sdk: {
        autocaptureClicks: tracking.autocaptureClicks !== false,
        scrollDepth: tracking.scrollDepth !== false,
        trackForms: tracking.trackForms !== false,
        spaPageviews: tracking.spaPageviews !== false,
        sessionTimeoutMinutes: tracking.sessionTimeoutMinutes ?? 30,
        debug: !!tracking.debug,
      },
      consent: {
        policyVersion: consent.policyVersion ?? '1',
        bannerVersion: consent.bannerVersion ?? '1',
        title: consent.title ?? 'Your privacy',
        body: consent.body ?? '',
        acceptLabel: consent.acceptLabel ?? 'Accept all',
        rejectLabel: consent.rejectLabel ?? 'Reject all',
        manageLabel: consent.manageLabel ?? 'Choose',
        privacyPolicyUrl: consent.privacyPolicyUrl ?? '/privacy',
      },
      pixels,
    }
  },
  ['site-config'],
  { tags: [SITE_CONFIG_TAG], revalidate: 600 },
)

export interface FunnelPlacement {
  funnelId: string
  stepId: string
  stepIndex: number
  nextStepPath?: string
}

/** Which funnel step (if any) a page is, and where "next step" goes (FR-FUN-1). */
export function getFunnelPlacement(pageId: string): Promise<FunnelPlacement | null> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'funnels',
        where: { 'steps.page': { equals: pageId }, active: { equals: true } },
        depth: 1,
        limit: 1,
        overrideAccess: true,
      })
      const funnel = res.docs[0]
      if (!funnel) return null
      const idx = funnel.steps.findIndex(
        (s) => (typeof s.page === 'object' ? s.page?.id : s.page) === pageId,
      )
      if (idx < 0) return null
      const next = funnel.steps[idx + 1]
      const nextPage = next && typeof next.page === 'object' ? next.page : null
      return {
        funnelId: String(funnel.id),
        stepId: funnel.steps[idx]!.stepId,
        stepIndex: idx,
        nextStepPath: nextPage ? (nextPage.slug === 'home' ? '/' : `/${nextPage.slug}`) : undefined,
      }
    },
    ['funnel-placement', pageId],
    { tags: [funnelTag(pageId)], revalidate: 600 },
  )()
}

/** If the page is a variant of a running experiment: its experiment, variant and step placement. */
export function getVariantPlacement(
  pageId: string,
): Promise<{ experimentId: string; variantKey: string; placement: FunnelPlacement | null } | null> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'experiments',
        where: { 'variants.page': { equals: pageId }, status: { equals: 'running' } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      const exp = res.docs[0]
      if (!exp) return null
      const variant = exp.variants.find(
        (v) => (typeof v.page === 'object' ? v.page?.id : v.page) === pageId,
      )
      const control = exp.variants[0]
      const controlId = control
        ? typeof control.page === 'object'
          ? control.page?.id
          : control.page
        : null
      const placement = controlId ? await getFunnelPlacement(String(controlId)) : null
      return { experimentId: String(exp.id), variantKey: variant?.key ?? 'control', placement }
    },
    ['variant-placement', pageId],
    { tags: [SITE_CONFIG_TAG, funnelTag(pageId)], revalidate: 300 },
  )()
}
