/**
 * Region -> consent regime (FR-CNS-1, ADR-0011). Region codes are ISO 3166-1 alpha-2 countries,
 * or `US-<state>` when the edge provides a subdivision. This table is a product default reviewed
 * by counsel; the CMS can override any region (ConsentSettings.overrides).
 */
export type Regime = 'opt_in' | 'opt_out' | 'notice'

/** EEA (EU-27 + IS, LI, NO), UK and Switzerland: prior opt-in (GDPR / ePrivacy / UK GDPR / FADP). */
const OPT_IN = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'GB',
  'CH',
  // LGPD: treated as opt-in for non-essential tracking by default.
  'BR',
])

/** Countries whose laws give an opt-out of "sale/sharing" (US state laws, honoured nationwide). */
const OPT_OUT = new Set(['US'])

export function normalizeRegion(country: string | null | undefined, subdivision?: string | null) {
  const c = country?.trim().toUpperCase()
  if (!c || !/^[A-Z]{2}$/.test(c)) return 'XX'
  const s = subdivision?.trim().toUpperCase()
  return s && /^[A-Z0-9]{1,3}$/.test(s) ? `${c}-${s}` : c
}

export interface RegimeOverrides {
  overrides?: { region: string; regime: Regime }[]
  defaultRegime?: Regime
}

/** Most specific match wins: `US-CA` override, then `US` override, then the built-in table. */
export function regimeFor(region: string, cfg: RegimeOverrides = {}): Regime {
  const country = region.slice(0, 2)
  const byRegion = new Map((cfg.overrides ?? []).map((o) => [o.region.toUpperCase(), o.regime]))
  const exact = byRegion.get(region.toUpperCase())
  if (exact) return exact
  const ctry = byRegion.get(country)
  if (ctry) return ctry
  if (OPT_IN.has(country)) return 'opt_in'
  if (OPT_OUT.has(country)) return 'opt_out'
  // Unknown location: the safest regime.
  if (country === 'XX') return 'opt_in'
  return cfg.defaultRegime ?? 'notice'
}
