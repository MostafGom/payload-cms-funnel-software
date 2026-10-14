import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the running stack (`pnpm infra:up`, seeded, `pnpm dev` + mock
 * destinations). CI starts the same processes before running this suite (plan §11).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_FUNNEL_URL ?? 'http://go.localhost:8080',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
})
