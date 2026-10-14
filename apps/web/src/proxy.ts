import { NextResponse, type NextRequest } from 'next/server'
import { normalizeRegion } from '@fp/consent'
import { assignVariant } from '@fp/experiments'
import { edgeConfig, regimeWith } from './lib/edge-config'

/**
 * Host-based routing (FR-FUN-4, ADR-0015): `go.brand.com/offer` -> `/sites/go.brand.com/offer`.
 * Also: sticky A/B assignment (FR-FUN-5, ADR-0016) and the region/regime hint cookie the SDK and
 * banner read (FR-CNS-1). Admin, Payload REST, our API and Next internals pass through untouched.
 */
const PASSTHROUGH = /^\/(admin|cms\/api|api|_next|_t|assets)(\/|$)/
const XID_COOKIE = '_cm_xid'
const REGION_COOKIE = '_cm_rg'
const YEAR = 365 * 24 * 3600

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  // The internal /sites tree is only reachable through the host rewrite, or in draft preview.
  if (/^\/sites(\/|$)/.test(pathname))
    return req.cookies.has('__prerender_bypass')
      ? NextResponse.next()
      : new NextResponse('Not Found', { status: 404 })
  if (PASSTHROUGH.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next()

  const host = hostnameOf(req.headers.get('x-forwarded-host') ?? req.headers.get('host'))
  if (!host) return new NextResponse('Bad Request', { status: 400 })

  const cfg = await edgeConfig()
  let target = pathname
  let xid = req.cookies.get(XID_COOKIE)?.value
  const newXid = !xid || !/^[0-9a-f-]{36}$/.test(xid)
  const route = cfg.routes.get(`${host}${pathname}`)
  if (route) {
    if (newXid) xid = crypto.randomUUID()
    const key = assignVariant(route.experimentId, xid!, route.variants)
    const variant = route.variants.find((v) => v.key === key)
    if (variant) target = variant.path
  }

  const url = req.nextUrl.clone()
  url.pathname = `/sites/${encodeURIComponent(host)}${target === '/' ? '' : target}`
  const res = NextResponse.rewrite(url)

  if (route && newXid && xid)
    res.cookies.set(XID_COOKIE, xid, {
      path: '/',
      maxAge: YEAR,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      httpOnly: false,
    })

  const debug = process.env.ALLOW_DEBUG_GEO === 'true' ? req.headers.get('x-fp-debug-geo') : null
  const [dc, ds] = debug?.split('-') ?? []
  const region = debug
    ? normalizeRegion(dc, ds)
    : normalizeRegion(req.headers.get('cf-ipcountry'), req.headers.get('cf-region-code'))
  const hint = `${region}|${regimeWith(cfg, region)}`
  if (req.cookies.get(REGION_COOKIE)?.value !== hint)
    res.cookies.set(REGION_COOKIE, hint, {
      path: '/',
      maxAge: 24 * 3600,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
    })
  return res
}

export function hostnameOf(header: string | null): string | null {
  const host = header?.split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '')
  return host && /^[a-z0-9.-]+$/.test(host) ? host : null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
