/**
 * Consent purposes encoded as a bitmask so every stored event carries a compact consent
 * snapshot (ADR-0011). Bit positions are append-only: never reuse or reorder.
 */
export const ConsentBit = {
  necessary: 1 << 0,
  analytics: 1 << 1,
  marketing: 1 << 2,
} as const
export type ConsentPurpose = keyof typeof ConsentBit

export function encodeConsent(purposes: Partial<Record<ConsentPurpose, boolean>>): number {
  let mask = ConsentBit.necessary
  for (const [k, granted] of Object.entries(purposes) as [ConsentPurpose, boolean][]) {
    if (granted) mask |= ConsentBit[k]
  }
  return mask
}

export const hasConsent = (mask: number, purpose: ConsentPurpose): boolean =>
  (mask & ConsentBit[purpose]) !== 0
