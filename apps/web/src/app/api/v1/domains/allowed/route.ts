import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Caddy on-demand TLS "ask" endpoint (ADR-0015): 200 issues a certificate, anything else refuses.
 * Prevents certificate issuance for arbitrary hostnames pointed at our IP.
 */
export async function GET(req: Request) {
  const domain = new URL(req.url).searchParams.get('domain')?.toLowerCase()
  if (!domain) return new Response('missing domain', { status: 400 })

  const payload = await getPayload({ config })
  const found = await payload.count({
    collection: 'domains',
    where: { hostname: { equals: domain }, active: { equals: true } },
    overrideAccess: true,
  })
  return new Response(null, { status: found.totalDocs > 0 ? 200 : 404 })
}
