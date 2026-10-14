import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { uuidv7 } from './util.ts'

describe('NFR-7: SDK budget', () => {
  it('core bundle is under 8 KB gzipped', async () => {
    const r = await build({
      entryPoints: [new URL('./index.ts', import.meta.url).pathname],
      bundle: true,
      minify: true,
      format: 'iife',
      target: ['es2019', 'safari15'],
      write: false,
      define: { __SDK_VERSION__: '"test"' },
    })
    const gz = gzipSync(r.outputFiles[0]!.contents).length
    expect(gz).toBeLessThan(8 * 1024)
  })
})

describe('ADR-0009: browser event ids', () => {
  it('generates valid, time-ordered UUIDv7', () => {
    const a = uuidv7()
    const b = uuidv7()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a.slice(0, 13) <= b.slice(0, 13)).toBe(true)
  })
})
