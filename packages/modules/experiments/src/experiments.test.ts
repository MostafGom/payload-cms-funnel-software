import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assignVariant, compareArms, pickWinner, sampleRatioMismatch } from './index.ts'

describe('FR-FUN-5: sticky weighted assignment', () => {
  const variants = [
    { key: 'a', weight: 50 },
    { key: 'b', weight: 50 },
  ]
  it('is deterministic per visitor', () => {
    const v = randomUUID()
    expect(assignVariant('exp1', v, variants)).toBe(assignVariant('exp1', v, variants))
  })
  it('splits 50/50 within ±2% over 10k visitors (phase 2 exit criterion)', () => {
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 10_000; i++)
      counts[assignVariant('exp1', randomUUID(), variants) as 'a' | 'b']++
    expect(Math.abs(counts.a / 10_000 - 0.5)).toBeLessThan(0.02)
  })
  it('honours uneven weights', () => {
    let b = 0
    for (let i = 0; i < 10_000; i++)
      if (
        assignVariant('exp2', randomUUID(), [
          { key: 'a', weight: 90 },
          { key: 'b', weight: 10 },
        ]) === 'b'
      )
        b++
    expect(Math.abs(b / 10_000 - 0.1)).toBeLessThan(0.02)
  })
})

describe('FR-FUN-5: statistics', () => {
  it('detects a significant lift and picks the winner', () => {
    const r = compareArms([
      { key: 'a', visitors: 5000, conversions: 500 },
      { key: 'b', visitors: 5000, conversions: 600 },
    ])
    expect(r[1]!.pValue!).toBeLessThan(0.01)
    expect(r[1]!.lift!).toBeCloseTo(0.2, 5)
    expect(pickWinner(r)).toBe('b')
  })
  it('does not declare a winner on noise or small samples', () => {
    expect(
      pickWinner(
        compareArms([
          { key: 'a', visitors: 5000, conversions: 500 },
          { key: 'b', visitors: 5000, conversions: 510 },
        ]),
      ),
    ).toBeNull()
    expect(
      pickWinner(
        compareArms([
          { key: 'a', visitors: 20, conversions: 1 },
          { key: 'b', visitors: 20, conversions: 10 },
        ]),
      ),
    ).toBeNull()
  })
  it('flags sample ratio mismatch', () => {
    expect(
      sampleRatioMismatch([
        { key: 'a', visitors: 5000, conversions: 0 },
        { key: 'b', visitors: 5050, conversions: 0 },
      ]).mismatch,
    ).toBe(false)
    expect(
      sampleRatioMismatch([
        { key: 'a', visitors: 5000, conversions: 0 },
        { key: 'b', visitors: 4000, conversions: 0 },
      ]).mismatch,
    ).toBe(true)
  })
})
