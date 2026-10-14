import { expect, type APIRequestContext, type Page } from '@playwright/test'
import postgres from 'postgres'

export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:8080'
export const MOCK_URL = process.env.MOCK_DESTINATIONS_URL ?? 'http://localhost:4010'
/** One connection per worker process, closed by Playwright's process exit. */
export const sql = postgres(process.env.DATABASE_URL ?? 'postgres://fp:fp@localhost:54330/fp', {
  max: 2,
  onnotice: () => {},
  idle_timeout: 5,
})

export const ATTRIBUTION_QUERY = {
  utm_source: 'meta',
  utm_medium: 'paid_social',
  utm_campaign: 'e2e',
  fbclid: 'E2E_FBCLID',
  ttclid: 'E2E_TTCLID',
  ScCid: 'E2E_SCCID',
  gclid: 'E2E_GCLID',
  aff_id: 'partner-42',
}

export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${ADMIN_URL}/cms/api/users/login`, {
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'change-me-locally-123',
    },
  })
  expect(res.ok()).toBeTruthy()
  return ((await res.json()) as { token: string }).token
}

/** Enables the browser pixel on the seeded Meta destination so pixel/CAPI dedupe can be asserted. */
export async function enableMetaBrowserPixel(request: APIRequestContext): Promise<void> {
  const token = await adminToken(request)
  const headers = { authorization: `JWT ${token}` }
  const list = await request.get(
    `${ADMIN_URL}/cms/api/destinations?where[type][equals]=meta&limit=1`,
    { headers },
  )
  const id = ((await list.json()) as { docs: { id: string }[] }).docs[0]!.id
  const res = await request.patch(`${ADMIN_URL}/cms/api/destinations/${id}`, {
    headers,
    data: { browserPixel: true },
  })
  expect(res.ok()).toBeTruthy()
}

/** Stubs Meta's fbevents.js: records every fbq call instead of contacting Facebook. */
export async function stubMetaPixel(page: Page): Promise<void> {
  await page.route('https://connect.facebook.net/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `(function(){var q=(window.fbq&&window.fbq.queue)||[];window.__fbq=[];window.fbq.callMethod=function(){window.__fbq.push([].slice.call(arguments))};q.forEach(function(a){window.__fbq.push(a)});})();`,
    }),
  )
  for (const host of ['https://analytics.tiktok.com/**', 'https://sc-static.net/**'])
    await page.route(host, (route) =>
      route.fulfill({ contentType: 'application/javascript', body: '' }),
    )
}

export async function clearMock(request: APIRequestContext) {
  await request.delete(`${MOCK_URL}/_requests`)
}

export async function mockRequests(request: APIRequestContext, path: string) {
  return (await (
    await request.get(`${MOCK_URL}/_requests?path=${encodeURIComponent(path)}`)
  ).json()) as {
    path: string
    body: { data?: { event_id?: string; user_data?: Record<string, unknown> }[] } & Record<
      string,
      unknown
    >
    headers: Record<string, string>
    raw: string
  }[]
}

export const uniqueEmail = (tag: string) => `e2e+${tag}-${Date.now()}@example.org`
