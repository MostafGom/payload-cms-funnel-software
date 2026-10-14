import type { Regime } from './regions.ts'

export interface ConsentChoice {
  analytics: boolean
  marketing: boolean
}

export interface EffectiveConsent extends ConsentChoice {
  regime: Regime
  /** the visitor made an explicit choice (banner / preference centre) */
  decided: boolean
  /** marketing was denied by an opt-out (choice or GPC) in an opt-out regime */
  optedOut: boolean
  gpc: boolean
}

/**
 * Server-side source of truth for what a visitor allows (FR-CNS-3). The SDK applies the same
 * function in the browser, but the server never trusts a client claim that exceeds this result.
 *
 *  regime   | no choice            | choice     | GPC signal
 *  opt_in   | nothing              | as chosen  | marketing off
 *  opt_out  | everything           | as chosen  | marketing off (sale/share opt-out)
 *  notice   | everything           | as chosen  | marketing off
 */
export function resolveConsent(input: {
  regime: Regime
  choice?: ConsentChoice | null
  gpc?: boolean
}): EffectiveConsent {
  const gpc = input.gpc === true
  const decided = !!input.choice
  const defaults = input.regime === 'opt_in' ? false : true
  const analytics = input.choice ? input.choice.analytics : defaults
  let marketing = input.choice ? input.choice.marketing : defaults
  if (gpc) marketing = false
  return {
    regime: input.regime,
    decided,
    analytics,
    marketing,
    gpc,
    optedOut: input.regime !== 'opt_in' && !marketing,
  }
}

/** Whether identifiers (anonymous id cookie, linking) may be stored (FR-TRK-6). */
export const mayStoreIdentifiers = (c: EffectiveConsent): boolean => c.analytics

export type DestinationDecision =
  | { send: true; limitedDataUse: boolean }
  | { send: false; reason: 'consent' }

/**
 * Destination gating (FR-DST-6). In opt-out regimes an opted-out visitor may still be sent to a
 * platform that supports Limited Data Use (Meta), flagged as such; everything else is skipped.
 */
export function destinationDecision(
  c: EffectiveConsent,
  opts: { supportsLimitedDataUse: boolean; limitedDataUseEnabled: boolean },
): DestinationDecision {
  if (c.marketing) return { send: true, limitedDataUse: false }
  if (
    c.regime === 'opt_out' &&
    c.optedOut &&
    opts.supportsLimitedDataUse &&
    opts.limitedDataUseEnabled
  )
    return { send: true, limitedDataUse: true }
  return { send: false, reason: 'consent' }
}

/** Google Consent Mode v2 signal mapping (FR-CNS-5). */
export function googleConsentMode(c: ConsentChoice) {
  const v = (b: boolean) => (b ? 'granted' : 'denied')
  return {
    ad_storage: v(c.marketing),
    ad_user_data: v(c.marketing),
    ad_personalization: v(c.marketing),
    analytics_storage: v(c.analytics),
    functionality_storage: 'granted',
    security_storage: 'granted',
  } as const
}
