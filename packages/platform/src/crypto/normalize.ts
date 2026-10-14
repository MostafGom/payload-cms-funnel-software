import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

/**
 * Normalization rules follow the Meta / TikTok / Snap advanced-matching specs so that hashes
 * match what the platforms compute on their side (ADR-0012).
 */

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const email = raw.trim().toLowerCase()
  // Deliberately permissive: full RFC validation happens in the form schema.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

/** Returns E.164 (e.g. `+14155550123`) or null when the number cannot be parsed as valid. */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountry?: CountryCode,
): string | null {
  if (!raw) return null
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry)
  return parsed?.isValid() ? parsed.number : null
}

/** Ad platforms expect E.164 digits without the leading `+` before hashing. */
export function phoneForHashing(e164: string): string {
  return e164.replace(/^\+/, '')
}

/** Lowercase, strip punctuation and whitespace; keeps letters from any script. */
export function normalizeName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const name = raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]/gu, '')
  return name || null
}

/** Two-letter lowercase ISO 3166-1 alpha-2. */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null
  const c = raw.trim().toLowerCase()
  return /^[a-z]{2}$/.test(c) ? c : null
}
