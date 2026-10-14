import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  ATTRIBUTION_QUERY,
  clearMock,
  enableMetaBrowserPixel,
  mockRequests,
  sql,
  stubMetaPixel,
  uniqueEmail,
} from './helpers'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

test.beforeAll(async ({ request }) => {
  await enableMetaBrowserPixel(request)
})

test('Phase 1A/1B exit: attribution, consent, pixel and CAPI share one event id', async ({
  page,
  request,
  context,
}) => {
  await clearMock(request)
  await stubMetaPixel(page)
  // US visitor (opt-out regime): tracking on by default, banner not forced.
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'US-CA' })
  const email = uniqueEmail('funnel')
  const query = new URLSearchParams(ATTRIBUTION_QUERY).toString()

  await page.goto(`/?${query}`)
  await expect(page.getByRole('heading', { name: 'Get the free guide' })).toBeVisible()
  await page.waitForFunction(() => !!(window as unknown as { fp?: unknown }).fp)

  await page.getByRole('textbox', { name: /^First name/ }).fill('Grace')
  await page.getByRole('textbox', { name: /^Email/ }).fill(email)
  await page.getByLabel('Email me tips and offers').check()
  await page.waitForTimeout(1200) // min-time spam check (1s in the seed)
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/forms/') && r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Send me the guide' }).click(),
  ])
  expect(response.status()).toBe(200)
  const { eventId } = (await response.json()) as { eventId: string }

  // Next funnel step (thank-you) keeps the attribution params.
  await page.waitForURL(/\/thank-you/)
  expect(new URL(page.url()).searchParams.get('fbclid')).toBe('E2E_FBCLID')

  // FR-FRM-3: the contact's submission stores exactly the visit's URL params.
  const [sub] = await sql<
    { attribution: { urlParams: Record<string, string> }; contact_id: string }[]
  >`
    SELECT s.attribution, s.contact_id FROM cms.form_submissions s JOIN cms.contacts c ON c.id = s.contact_id
    WHERE c.email = ${email}`
  expect(sub!.attribution.urlParams).toEqual(ATTRIBUTION_QUERY)

  // FR-DST-4: CAPI received the same event id as the browser pixel's Lead.
  await expect
    .poll(async () =>
      (await mockRequests(request, '/meta'))
        .flatMap((r) => r.body.data ?? [])
        .map((d) => d.event_id),
    )
    .toContain(eventId)
  const capi = (await mockRequests(request, '/meta'))
    .flatMap((r) => r.body.data ?? [])
    .find((d) => d.event_id === eventId)!
  expect(capi.user_data?.em).toEqual([sha256(email.toLowerCase())])
  expect(String(capi.user_data?.fbc)).toMatch(/^fb\.1\.\d+\.E2E_FBCLID$/)

  // The Lead was fired on the landing page before navigation; read it from the recorded calls there.
  const leads = await sql<
    { n: number }[]
  >`SELECT count(*)::int AS n FROM cdp.destination_deliveries WHERE event_id = ${eventId} AND status = 'success'`
  expect(leads[0]!.n).toBeGreaterThanOrEqual(4) // meta, tiktok, snap, webhook

  // FR-DST-9: the webhook is signed per Standard Webhooks.
  const hook = (await mockRequests(request, '/webhook')).find((r) => r.raw.includes(eventId))!
  expect(hook.headers['webhook-signature']).toMatch(/^v1,/)
})

test('FR-DST-4: browser pixel Lead uses the submission event id', async ({ page, context }) => {
  await stubMetaPixel(page)
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'US-TX' })
  await page.goto('/?utm_source=meta&fbclid=PIXELTEST')
  await page.waitForFunction(() => !!(window as unknown as { __fbq?: unknown[] }).__fbq)
  await page.getByRole('textbox', { name: /^First name/ }).fill('Pixel')
  await page.getByRole('textbox', { name: /^Email/ }).fill(uniqueEmail('pixel'))
  await page.waitForTimeout(1200)
  // Stay on the page: intercept the redirect so the recorded fbq calls stay readable.
  await page.evaluate(() => {
    window.location.assign = () => {}
  })
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v1/forms/')),
    page.getByRole('button', { name: 'Send me the guide' }).click(),
  ])
  const { eventId } = (await response.json()) as { eventId: string }
  const calls = await page.evaluate(() => (window as unknown as { __fbq: unknown[][] }).__fbq)
  const lead = calls.find((c) => c[0] === 'track' && c[1] === 'Lead')
  expect(lead?.[3]).toEqual({ eventID: eventId })
})
