import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/edge-config', async () => {
  const { regimeFor } = await import('@fp/consent')
  const cfg = {
    routes: new Map([
      [
        'go.brand.com/offer',
        {
          experimentId: 'exp1',
          variants: [
            { key: 'a', weight: 50, path: '/offer' },
            { key: 'b', weight: 50, path: '/offer-b' },
          ],
        },
      ],
    ]),
    consent: {
      policyVersion: '1',
      bannerVersion: '1',
      overrides: [{ region: 'JP', regime: 'opt_in' }],
      defaultRegime: 'notice',
    },
    loadedAt: Date.now(),
  }
  return {
    edgeConfig: async () => cfg,
    regimeWith: (c: typeof cfg, r: string) => regimeFor(r, c.consent as never),
  }
})

const { hostnameOf, proxy } = await import('./proxy')

// Real requests always carry Host; synthetic NextRequests do not, so set it like a browser would.
const run = (url: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(url, { headers: { host: new URL(url).host, ...headers } }))
const rewriteOf = async (url: string, headers: Record<string, string> = {}) =>
  (await run(url, headers)).headers.get('x-middleware-rewrite')

describe('FR-FUN-4: host routing', () => {
  it('rewrites site paths to /sites/<host>/<path>', async () => {
    expect(await rewriteOf('http://go.brand.com/step-2')).toBe(
      'http://go.brand.com/sites/go.brand.com/step-2',
    )
    expect(await rewriteOf('http://go.brand.com/')).toBe('http://go.brand.com/sites/go.brand.com')
  })

  it('prefers x-forwarded-host from the trusted proxy', async () => {
    expect(await rewriteOf('http://localhost:3000/x', { 'x-forwarded-host': 'go.brand.com' })).toBe(
      'http://localhost:3000/sites/go.brand.com/x',
    )
  })

  it('passes admin, APIs, collector, next internals and static files through', async () => {
    for (const p of [
      '/admin',
      '/admin/collections/pages',
      '/cms/api/pages',
      '/api/v1/x',
      '/_t/e',
      '/_next/data',
      '/robots.txt',
      '/assets/fp.js',
    ]) {
      expect(await rewriteOf(`http://go.brand.com${p}`), p).toBeNull()
    }
  })

  it('rejects requests without a usable host', async () => {
    expect((await proxy(new NextRequest('http://x/offer'))).status).toBe(400)
  })

  it('normalizes and validates host headers', () => {
    expect(hostnameOf('Go.Brand.com:8080')).toBe('go.brand.com')
    expect(hostnameOf('a.com, b.com')).toBe('a.com')
    expect(hostnameOf('evil/../x')).toBeNull()
    expect(hostnameOf(null)).toBeNull()
  })
})

describe('FR-FUN-5: sticky experiment assignment', () => {
  it('assigns a variant, sets the visitor cookie, and keeps the assignment', async () => {
    const res = await run('http://go.brand.com/offer')
    const xid = res.cookies.get('_cm_xid')?.value
    expect(xid).toMatch(/^[0-9a-f-]{36}$/)
    const first = res.headers.get('x-middleware-rewrite')
    for (let i = 0; i < 5; i++)
      expect(await rewriteOf('http://go.brand.com/offer', { cookie: `_cm_xid=${xid}` })).toBe(first)
  })

  it('splits traffic across both variants', async () => {
    const seen = new Set<string | null>()
    for (let i = 0; i < 40; i++) seen.add(await rewriteOf('http://go.brand.com/offer'))
    expect([...seen].sort()).toEqual([
      'http://go.brand.com/sites/go.brand.com/offer',
      'http://go.brand.com/sites/go.brand.com/offer-b',
    ])
  })
})

describe('FR-CNS-1: region hint cookie', () => {
  it('derives region and regime from edge headers, with config overrides', async () => {
    const hint = async (h: Record<string, string>) =>
      (await run('http://go.brand.com/x', h)).cookies.get('_cm_rg')?.value
    expect(await hint({ 'cf-ipcountry': 'DE' })).toBe('DE|opt_in')
    expect(await hint({ 'cf-ipcountry': 'US', 'cf-region-code': 'CA' })).toBe('US-CA|opt_out')
    expect(await hint({ 'cf-ipcountry': 'JP' })).toBe('JP|opt_in')
    expect(await hint({ 'cf-ipcountry': 'IN' })).toBe('IN|notice')
    expect(await hint({})).toBe('XX|opt_in')
  })
})
