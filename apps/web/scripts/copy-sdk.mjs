// Copies the built tracker SDK into public/ so it is served same-origin at /assets/fp.js.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const src = require.resolve('@fp/tracker-sdk/dist/fp.js')
mkdirSync(new URL('../public/assets/', import.meta.url), { recursive: true })
copyFileSync(src, new URL('../public/assets/fp.js', import.meta.url))
