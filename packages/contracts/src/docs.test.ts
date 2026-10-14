import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eventCatalog, openapi } from '../scripts/generate-docs.ts'

describe('ADR-0021: generated API docs are current', () => {
  it('docs/api/openapi.json and docs/event-catalog.md match the contracts (run pnpm docs:generate)', () => {
    const root = new URL('../../../', import.meta.url)
    expect(JSON.parse(readFileSync(new URL('docs/api/openapi.json', root), 'utf8'))).toEqual(
      JSON.parse(JSON.stringify(openapi())),
    )
    expect(readFileSync(new URL('docs/event-catalog.md', root), 'utf8')).toBe(eventCatalog())
  })
})
