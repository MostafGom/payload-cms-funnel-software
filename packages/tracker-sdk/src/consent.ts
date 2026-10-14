import { getCookie, setCookie } from './util.ts'

/**
 * Browser half of consent (FR-CNS-1/3). The region and regime come from the `_cm_rg` cookie the
 * server sets (proxy.ts); the choice is stored in `_cm_c` (strictly necessary). The server
 * re-derives the same result and never trusts more than it allows.
 */
export type Regime = 'opt_in' | 'opt_out' | 'notice'
export interface Consent {
  a: boolean
  m: boolean
  /** decided explicitly */
  d: boolean
  v?: string
}

const CHOICE_COOKIE = '_cm_c'

export function regionHint(): { region: string; regime: Regime } {
  const [region = 'XX', regime = 'opt_in'] = (getCookie('_cm_rg') ?? '').split('|')
  return {
    region,
    regime: (['opt_in', 'opt_out', 'notice'].includes(regime) ? regime : 'opt_in') as Regime,
  }
}

export const gpc = (): boolean =>
  (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true

/** Stored choice for the current policy version, if any. Format: `a1m0.<policyVersion>`. */
export function storedChoice(policyVersion: string): { a: boolean; m: boolean } | null {
  const c = getCookie(CHOICE_COOKIE)
  const m = c?.match(/^a([01])m([01])\.(.+)$/)
  if (!m || m[3] !== policyVersion) return null
  return { a: m[1] === '1', m: m[2] === '1' }
}

export function saveChoice(policyVersion: string, a: boolean, m: boolean): void {
  setCookie(CHOICE_COOKIE, `a${a ? 1 : 0}m${m ? 1 : 0}.${policyVersion}`, 180 * 24 * 3600)
}

export function effective(
  regime: Regime,
  choice: { a: boolean; m: boolean } | null,
  policyVersion: string,
): Consent {
  const def = regime !== 'opt_in'
  const c: Consent = {
    a: choice ? choice.a : def,
    m: choice ? choice.m : def,
    d: !!choice,
    v: policyVersion,
  }
  if (gpc()) c.m = false
  return c
}
