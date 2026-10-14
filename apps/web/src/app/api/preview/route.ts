import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

/** Enables draft mode for a signed-in editor and opens the page's internal site URL (FR-FUN-3). */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('page')
  if (!id) return new Response('missing page', { status: 400 })
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return new Response('Unauthorized', { status: 401 })
  const page = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    depth: 1,
    user,
    overrideAccess: false,
  })
  const host = typeof page.domain === 'object' ? page.domain.hostname : null
  if (!host) return new Response('page has no domain', { status: 400 })
  ;(await draftMode()).enable()
  redirect(`/sites/${encodeURIComponent(host)}${page.slug === 'home' ? '' : `/${page.slug}`}`)
}
