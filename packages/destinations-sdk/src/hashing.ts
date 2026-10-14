import {
  isSha256Hex,
  normalizeCountry,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  phoneForHashing,
  sha256Hex,
} from '@fp/platform/crypto'
import type { DeliveryUser } from './types.ts'

/** Normalize then SHA-256 (FR-DST-5). Values already hashed are passed through untouched. */
const h = (v: string | null | undefined): string | undefined =>
  v ? (isSha256Hex(v) ? v : sha256Hex(v)) : undefined

export interface HashedUser {
  em?: string
  ph?: string
  fn?: string
  ln?: string
  ct?: string
  country?: string
  external_id?: string
}

export function hashUser(u: DeliveryUser): HashedUser {
  const phone = normalizePhone(u.phone)
  return {
    em: h(normalizeEmail(u.email)),
    ph: h(phone ? phoneForHashing(phone) : null),
    fn: h(normalizeName(u.firstName)),
    ln: h(normalizeName(u.lastName)),
    ct: h(normalizeName(u.city)),
    country: h(normalizeCountry(u.country)),
    external_id: h(u.contactId),
  }
}

/** Removes undefined/empty keys so payloads stay minimal (and diffable in fixtures). */
export function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length),
    ),
  ) as Partial<T>
}

/** Delivery-log summary: which match keys were present, never the values. */
export function matchKeys(o: Record<string, unknown>): string[] {
  return Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k]) => k)
    .sort()
}
