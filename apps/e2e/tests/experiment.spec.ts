import { expect, test } from '@playwright/test'
import { ADMIN_URL, adminToken, sql } from './helpers'

/**
 * FR-FUN-5: sticky A/B assignment in proxy.ts, exposure events, per-variant results.
 * Creates a variant of the landing page and a running experiment, then cleans up.
 */
test('A/B split: both variants served, assignment sticky, exposures recorded', async ({
  browser,
  request,
}) => {
  const token = await adminToken(request)
  const headers = { authorization: `JWT ${token}`, origin: ADMIN_URL }
  const api = (path: string) => `${ADMIN_URL}/cms/api/${path}`
  const domain = (
    (await (
      await request.get(api('domains?where[hostname][equals]=go.localhost'), { headers })
    ).json()) as { docs: { id: string }[] }
  ).docs[0]!
  const landing = (
    (await (
      await request.get(api(`pages?where[domain][equals]=${domain.id}&where[slug][equals]=home`), {
        headers,
      })
    ).json()) as { docs: { id: string; layout: unknown[] }[] }
  ).docs[0]!
  const funnel = (
    (await (await request.get(api('funnels?limit=1'), { headers })).json()) as {
      docs: { id: string }[]
    }
  ).docs[0]!

  const variantSlug = `home-b-${Date.now()}`
  const variantRes = await request.post(api('pages'), {
    headers,
    data: {
      _status: 'published',
      title: 'Free guide (B)',
      slug: variantSlug,
      domain: domain.id,
      // Same form as the control, different hero (keeps the test independent of block internals).
      layout: [
        { blockType: 'hero', headline: 'Variant B: the free guide' },
        (landing.layout as { blockType: string; form: unknown }[])
          .filter((b) => b.blockType === 'form')
          .map((b) => ({
            blockType: 'form',
            form: typeof b.form === 'object' ? (b.form as { id: string }).id : b.form,
          }))[0],
      ],
    },
  })
  expect(variantRes.ok(), await variantRes.text()).toBeTruthy()
  const variant = (await variantRes.json()) as { doc: { id: string } }
  const exp = (await (
    await request.post(api('experiments'), {
      headers,
      data: {
        name: `e2e ${variantSlug}`,
        status: 'running',
        funnel: funnel.id,
        stepId: 'landing',
        variants: [
          { key: 'a', weight: 50, page: landing.id },
          { key: 'b', weight: 50, page: variant.doc.id },
        ],
      },
    })
  ).json()) as { doc: { id: string } }

  try {
    // Edge config refreshes every 15 s.
    const seen = new Map<string, number>()
    await expect
      .poll(
        async () => {
          for (let i = 0; i < 10; i++) {
            const ctx = await browser.newContext({
              extraHTTPHeaders: { 'x-fp-debug-geo': 'US-CA' },
            })
            const page = await ctx.newPage()
            await page.goto('/')
            const h = (await page.locator('h1').first().textContent()) ?? ''
            seen.set(h, (seen.get(h) ?? 0) + 1)
            await page.evaluate(() => (window as unknown as { fp?: { flush(): void } }).fp?.flush())
            await page.waitForTimeout(300)
            await ctx.close()
          }
          return seen.size
        },
        { timeout: 60_000, intervals: [1000] },
      )
      .toBe(2)

    // Sticky: one visitor keeps seeing the same variant.
    const ctx = await browser.newContext({ extraHTTPHeaders: { 'x-fp-debug-geo': 'US-CA' } })
    const page = await ctx.newPage()
    await page.goto('/')
    const first = await page.locator('h1').first().textContent()
    for (let i = 0; i < 5; i++) {
      await page.goto('/')
      expect(await page.locator('h1').first().textContent()).toBe(first)
    }
    await ctx.close()

    await expect
      .poll(
        async () =>
          (
            await sql`SELECT DISTINCT variant_key FROM cdp.experiment_assignments WHERE experiment_id = ${exp.doc.id} AND exposed_at IS NOT NULL`
          ).length,
        { timeout: 30_000 },
      )
      .toBe(2)
  } finally {
    await request.patch(api(`experiments/${exp.doc.id}`), { headers, data: { status: 'stopped' } })
    // The proxy's routing cache refreshes every 15 s: wait until fresh visitors only get the
    // control before deleting the variant page, so later tests never hit a removed route.
    await expect
      .poll(
        async () => {
          for (let i = 0; i < 6; i++) {
            const ctx = await browser.newContext()
            const p = await ctx.newPage()
            await p.goto('/')
            const h = await p.locator('h1').first().textContent()
            await ctx.close()
            if (h?.startsWith('Variant B')) return false
          }
          return true
        },
        { timeout: 40_000, intervals: [2000] },
      )
      .toBe(true)
    await request.delete(api(`experiments/${exp.doc.id}`), { headers })
    await request.delete(api(`pages/${variant.doc.id}`), { headers })
  }
})
