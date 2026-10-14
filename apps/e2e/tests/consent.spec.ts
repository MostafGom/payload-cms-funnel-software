import { expect, test } from '@playwright/test'
import { enableMetaBrowserPixel, stubMetaPixel } from './helpers'

test.beforeAll(async ({ request }) => {
  await enableMetaBrowserPixel(request)
})

/**
 * Consent matrix (plan §11, FR-CNS-1/3, FR-TRK-6): no pixel requests and no identifier cookie
 * before consent in opt-in regions; defaults on in opt-out regions; GPC turns marketing off.
 */
for (const region of ['DE', 'FR', 'GB', 'BR']) {
  test(`${region}: banner shown, nothing linkable before consent, pixels only after accepting`, async ({
    page,
    context,
  }) => {
    const pixelRequests: string[] = []
    page.on('request', (r) => {
      if (/facebook\.net|tiktok\.com|sc-static\.net/.test(r.url())) pixelRequests.push(r.url())
    })
    await stubMetaPixel(page)
    await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': region })
    await page.goto('/?utm_source=meta&fbclid=CONSENT')
    const banner = page.getByRole('dialog', { name: 'Your privacy' })
    await expect(banner).toBeVisible()
    await page.waitForTimeout(1500)
    expect(pixelRequests).toEqual([])
    const before = await context.cookies()
    expect(before.find((c) => c.name === '_cm_aid')).toBeUndefined()
    expect(before.find((c) => c.name === '_fbc')).toBeUndefined()

    await banner.getByRole('button', { name: 'Accept all' }).click()
    await expect(banner).toBeHidden()
    await expect.poll(() => pixelRequests.length).toBeGreaterThan(0)
    await page.evaluate(() => (window as unknown as { fp: { flush(): void } }).fp.flush())
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === '_cm_aid'))
      .toBe(true)
  })
}

test('DE: rejecting keeps pixels off and logs the choice', async ({ page, context }) => {
  const pixelRequests: string[] = []
  page.on('request', (r) => /facebook\.net/.test(r.url()) && pixelRequests.push(r.url()))
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'DE' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Reject all' }).click()
  await page.waitForTimeout(1500)
  expect(pixelRequests).toEqual([])
  const choice = (await context.cookies()).find((c) => c.name === '_cm_c')
  expect(choice?.value).toBe('a0m0.1')
})

test('US-CA: opt-out regime tracks by default without a banner', async ({ page, context }) => {
  await stubMetaPixel(page)
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'US-CA' })
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'Your privacy' })).toBeHidden()
  await page.evaluate(() => (window as unknown as { fp: { flush(): void } }).fp.flush())
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name === '_cm_aid'))
    .toBe(true)
})

test('US-CA with GPC: marketing off (no pixels), analytics on', async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-fp-debug-geo': 'US-CA', 'sec-gpc': '1' },
  })
  await context.addInitScript(() =>
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }),
  )
  const page = await context.newPage()
  const pixelRequests: string[] = []
  page.on('request', (r) => /facebook\.net/.test(r.url()) && pixelRequests.push(r.url()))
  await page.goto('/')
  await page.waitForTimeout(1500)
  expect(pixelRequests).toEqual([])
  const consent = await page.evaluate(() =>
    (
      window as unknown as { fp: { consent: { get(): { a: boolean; m: boolean } } } }
    ).fp.consent.get(),
  )
  expect(consent).toMatchObject({ a: true, m: false })
  await context.close()
})

test('US-TX: opt-out default', async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'x-fp-debug-geo': 'US-TX' })
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'Your privacy' })).toBeHidden()
})
