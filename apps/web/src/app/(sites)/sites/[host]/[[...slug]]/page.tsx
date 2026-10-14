import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { RenderBlocks } from '@/cms/blocks/renderers'
import { setPageContext } from '@/cms/page-context'
import { getDraftPage, getPublishedPage, slugFromSegments } from '@/lib/sites'
import { getFunnelPlacement, getVariantPlacement } from '@/lib/site-config'
import { safeJson } from '@/lib/json'
import { LivePreviewRefresh } from './LivePreviewRefresh'

type Args = { params: Promise<{ host: string; slug?: string[] }> }

/** Reached only through the host rewrite in proxy.ts (ADR-0015), or in draft preview. */
export default async function SitePage({ params }: Args) {
  const { host, slug } = await params
  const { isEnabled: draft } = await draftMode()
  const hostname = decodeURIComponent(host)
  const page = draft
    ? await getDraftPage(hostname, slugFromSegments(slug))
    : await getPublishedPage(hostname, slugFromSegments(slug))
  if (!page) notFound()

  // Funnel step for this page, or for the experiment it is a variant of (FR-FUN-1/5).
  const variant = await getVariantPlacement(String(page.id))
  const placement = variant?.placement ?? (await getFunnelPlacement(String(page.id)))
  setPageContext({
    pageId: String(page.id),
    funnelId: placement?.funnelId,
    stepId: placement?.stepId,
    nextStepPath: placement?.nextStepPath,
    experimentId: variant?.experimentId,
    variantKey: variant?.variantKey,
  })
  const pageConfig = {
    pageId: String(page.id),
    funnel: placement
      ? {
          funnel_id: placement.funnelId,
          step_id: placement.stepId,
          variant_key: variant?.variantKey,
          experiment_id: variant?.experimentId,
        }
      : undefined,
    tracking: {
      disabled: !!page.tracking?.disableTracking || draft,
      noPixels: !!page.tracking?.disablePixels,
      noAutocapture: !!page.tracking?.disableAutocapture,
      pageEvent: page.tracking?.pageEvent || undefined,
    },
  }
  return (
    <>
      <RenderBlocks blocks={page.layout} />
      <script
        id="fp-page"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: safeJson(pageConfig) }}
      />
      {draft ? <LivePreviewRefresh serverURL={process.env.NEXT_PUBLIC_SERVER_URL ?? ''} /> : null}
    </>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { host, slug } = await params
  const hostname = decodeURIComponent(host)
  const s = slugFromSegments(slug)
  const page = await getPublishedPage(hostname, s)
  if (!page) return {}
  const image = typeof page.seo?.image === 'object' ? page.seo?.image?.url : undefined
  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || undefined,
    robots: page.seo?.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: `https://${hostname}/${s ?? ''}` },
    openGraph: image ? { images: [image] } : undefined,
  }
}
