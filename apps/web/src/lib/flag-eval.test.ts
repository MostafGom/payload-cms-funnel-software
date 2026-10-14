import { describe, expect, it } from 'vitest'
import { evaluateFlag } from './flag-eval'

describe('ADR-0023: feature flags', () => {
  const flags = [
    { key: 'on', enabled: true, rolloutPercent: 100 },
    { key: 'off', enabled: false, rolloutPercent: 100 },
    { key: 'half', enabled: true, rolloutPercent: 50 },
  ]
  it('evaluates on/off/unknown', () => {
    expect(evaluateFlag(flags, 'on')).toBe(true)
    expect(evaluateFlag(flags, 'off')).toBe(false)
    expect(evaluateFlag(flags, 'missing')).toBe(false)
  })
  it('rolls out to a stable share of subjects', () => {
    const on = Array.from({ length: 4000 }, (_, i) =>
      evaluateFlag(flags, 'half', `user-${i}`),
    ).filter(Boolean).length
    expect(Math.abs(on / 4000 - 0.5)).toBeLessThan(0.04)
    expect(evaluateFlag(flags, 'half', 'user-7')).toBe(evaluateFlag(flags, 'half', 'user-7'))
  })
})
