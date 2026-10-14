import { describe, expect, it } from 'vitest'
import { PAGE_BLOCKS } from './registry'
import { BLOCK_RENDERERS } from './renderers'

describe('NFR-13: block registry contract', () => {
  it('every block config has a renderer and every renderer has a config', () => {
    const configs = PAGE_BLOCKS.map((b) => b.slug).sort()
    expect(Object.keys(BLOCK_RENDERERS).sort()).toEqual(configs)
  })

  it('block slugs are unique and every block declares an interfaceName for typed renderers', () => {
    expect(new Set(PAGE_BLOCKS.map((b) => b.slug)).size).toBe(PAGE_BLOCKS.length)
    for (const b of PAGE_BLOCKS) expect(b.interfaceName, b.slug).toBeTruthy()
  })
})
