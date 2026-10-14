import { build, context } from 'esbuild'
import { readFileSync } from 'node:fs'

/** Builds the browser SDK as one minified IIFE (FR-TRK-1). Size budget is enforced by sdk.test.ts. */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }
const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'iife' as const,
  target: ['es2019', 'safari15'],
  outfile: 'dist/fp.js',
  define: { __SDK_VERSION__: JSON.stringify(version) },
  legalComments: 'none' as const,
}
if (process.argv.includes('--watch')) await (await context(options)).watch()
else await build(options)
