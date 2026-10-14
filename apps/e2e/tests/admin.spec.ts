import { expect, test } from '@playwright/test'
import { ADMIN_URL } from './helpers'

/** Admin smoke: login and every custom view renders without errors (dashboards v1). */
test('admin login and custom views', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${ADMIN_URL}/admin/login`)
  await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test')
  await page.getByLabel('Password').fill(process.env.SEED_ADMIN_PASSWORD ?? 'change-me-locally-123')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL(/\/admin$/)
  for (const [path, heading] of [
    ['/admin/analytics', 'Funnel analytics'],
    ['/admin/deliveries', 'Destination health (24h)'],
    ['/admin/duplicates', 'Possible duplicates'],
  ] as const) {
    await page.goto(`${ADMIN_URL}${path}`)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
  await page.goto(`${ADMIN_URL}/admin/collections/contacts`)
  const first = page.locator('table tbody tr a').first()
  await first.click()
  await page.getByRole('link', { name: 'Timeline' }).click()
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible()
  expect(errors).toEqual([])
})
