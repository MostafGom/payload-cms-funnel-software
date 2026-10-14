import path from 'node:path'
import { defineConfig } from 'vitest/config'

// apps/web path aliases (mirrors apps/web/tsconfig.json) so web modules are testable.
const webAlias = {
  '@/': `${path.resolve(import.meta.dirname, 'apps/web/src')}/`,
  '@payload-config': path.resolve(import.meta.dirname, 'apps/web/src/payload.config.ts'),
}

// Two projects: `unit` (no I/O, runs everywhere) and `integration` (needs `pnpm infra:up`).
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: webAlias },
        test: {
          name: 'unit',
          include: ['{apps,packages}/**/src/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: webAlias },
        test: {
          name: 'integration',
          include: ['{apps,packages}/**/src/**/*.int.test.ts'],
          exclude: ['**/node_modules/**'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
})
