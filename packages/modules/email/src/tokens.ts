import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed, expiring email link tokens (FR-EML-1/4): `<purpose>.<contactId>.<expSeconds>.<sig>`.
 * Stateless, so links keep working even if the message row is gone; purpose-bound so an
 * unsubscribe token cannot confirm an opt-in.
 */
export type TokenPurpose = 'unsub' | 'confirm'

const b64 = (b: Buffer) => b.toString('base64url')
const sign = (secret: string, body: string) =>
  b64(createHmac('sha256', secret).update(body).digest())

export function createLinkToken(
  secret: string,
  purpose: TokenPurpose,
  contactId: string,
  ttlSeconds: number,
  now = Date.now(),
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds
  const body = `${purpose}.${contactId}.${exp}`
  return `${body}.${sign(secret, body)}`
}

export function verifyLinkToken(
  secret: string,
  purpose: TokenPurpose,
  token: string | null | undefined,
  now = Date.now(),
):
  | { ok: true; contactId: string }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'wrong_purpose' } {
  const parts = token?.split('.') ?? []
  if (parts.length !== 4) return { ok: false, reason: 'malformed' }
  const [p, contactId, exp, sig] = parts as [string, string, string, string]
  const expected = sign(secret, `${p}.${contactId}.${exp}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' }
  if (p !== purpose) return { ok: false, reason: 'wrong_purpose' }
  if (Number(exp) * 1000 < now) return { ok: false, reason: 'expired' }
  return { ok: true, contactId }
}

/** Unsubscribe links must keep working for a long time (CAN-SPAM requires >= 30 days). */
export const UNSUBSCRIBE_TTL = 400 * 24 * 3600
export const CONFIRM_TTL = 7 * 24 * 3600
