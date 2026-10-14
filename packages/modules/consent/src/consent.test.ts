import { describe, expect, it } from 'vitest'
import {
  destinationDecision,
  googleConsentMode,
  normalizeRegion,
  regimeFor,
  resolveConsent,
  type Regime,
} from './index.ts'

describe('FR-CNS-1: region regimes', () => {
  it.each([
    ['DE', 'opt_in'],
    ['FR', 'opt_in'],
    ['GB', 'opt_in'],
    ['CH', 'opt_in'],
    ['NO', 'opt_in'],
    ['BR', 'opt_in'],
    ['US-CA', 'opt_out'],
    ['US-TX', 'opt_out'],
    ['US', 'opt_out'],
    ['JP', 'notice'],
    ['XX', 'opt_in'],
  ] as [string, Regime][])('%s -> %s', (region, regime) => {
    expect(regimeFor(region)).toBe(regime)
  })

  it('applies overrides, most specific first', () => {
    const cfg = {
      overrides: [
        { region: 'US', regime: 'notice' as const },
        { region: 'US-CA', regime: 'opt_in' as const },
      ],
      defaultRegime: 'opt_out' as const,
    }
    expect(regimeFor('US-CA', cfg)).toBe('opt_in')
    expect(regimeFor('US-TX', cfg)).toBe('notice')
    expect(regimeFor('JP', cfg)).toBe('opt_out')
  })

  it('normalizes edge headers', () => {
    expect(normalizeRegion('us', 'ca')).toBe('US-CA')
    expect(normalizeRegion('de', null)).toBe('DE')
    expect(normalizeRegion('T1', null)).toBe('XX') // Tor exit / unknown
    expect(normalizeRegion(undefined)).toBe('XX')
  })
})

describe('FR-CNS-3: effective consent matrix', () => {
  const yes = { analytics: true, marketing: true }
  const no = { analytics: false, marketing: false }
  it.each([
    // regime, choice, gpc, analytics, marketing
    ['opt_in', null, false, false, false],
    ['opt_in', yes, false, true, true],
    ['opt_in', yes, true, true, false],
    ['opt_out', null, false, true, true],
    ['opt_out', null, true, true, false],
    ['opt_out', no, false, false, false],
    ['notice', null, false, true, true],
    ['notice', no, false, false, false],
  ] as const)('%s choice=%j gpc=%s', (regime, choice, gpc, analytics, marketing) => {
    const c = resolveConsent({ regime, choice, gpc })
    expect([c.analytics, c.marketing]).toEqual([analytics, marketing])
  })
})

describe('FR-DST-6: destination gating and LDU', () => {
  const meta = { supportsLimitedDataUse: true, limitedDataUseEnabled: true }
  const tiktok = { supportsLimitedDataUse: false, limitedDataUseEnabled: false }
  it('sends with marketing consent', () => {
    expect(
      destinationDecision(
        resolveConsent({ regime: 'opt_in', choice: { analytics: true, marketing: true } }),
        meta,
      ),
    ).toEqual({ send: true, limitedDataUse: false })
  })
  it('skips opt-in visitors without consent', () => {
    expect(destinationDecision(resolveConsent({ regime: 'opt_in' }), meta)).toEqual({
      send: false,
      reason: 'consent',
    })
  })
  it('flags LDU for opted-out US visitors on Meta and skips platforms without LDU', () => {
    const c = resolveConsent({ regime: 'opt_out', gpc: true })
    expect(destinationDecision(c, meta)).toEqual({ send: true, limitedDataUse: true })
    expect(destinationDecision(c, tiktok)).toEqual({ send: false, reason: 'consent' })
  })
})

describe('FR-CNS-5: Google Consent Mode v2', () => {
  it('maps purposes to signals', () => {
    expect(googleConsentMode({ analytics: true, marketing: false })).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })
})
