/**
 * Cheap spam signals checked before any write (FR-FRM-5). Turnstile and rate limits are applied
 * by the HTTP layer because they need I/O.
 */
export type SpamVerdict =
  | { ok: true }
  | { ok: false; reason: 'honeypot' | 'too_fast' | 'disposable_email' | 'stale' }

/** Small built-in list of the most common throwaway domains; extend via config. */
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'getnada.com',
  'trashmail.com',
  'dispostable.com',
  'maildrop.cc',
  'mintemail.com',
  'fakeinbox.com',
  'mohmal.com',
  'emailondeck.com',
  'tempail.com',
  'spamgourmet.com',
  'mailnesia.com',
  'mytemp.email',
  'tempinbox.com',
  'moakt.com',
  'burnermail.io',
  'mailcatch.com',
  'inboxkitten.com',
  'tempr.email',
  'discard.email',
  'spambox.us',
  'emailfake.com',
  'trashmail.de',
  'mailpoof.com',
  'tmail.ws',
  'tmpmail.org',
  'minuteinbox.com',
])

const MAX_FORM_AGE_MS = 24 * 3600 * 1000

export function checkSpam(input: {
  honeypot?: string
  startedAt: number
  now: number
  minSeconds: number
  email?: string | null
  blockDisposable: boolean
  extraDisposable?: Iterable<string>
}): SpamVerdict {
  if (input.honeypot && input.honeypot.trim() !== '') return { ok: false, reason: 'honeypot' }
  const elapsed = input.now - input.startedAt
  if (elapsed < input.minSeconds * 1000) return { ok: false, reason: 'too_fast' }
  if (elapsed > MAX_FORM_AGE_MS) return { ok: false, reason: 'stale' }
  if (input.blockDisposable && input.email) {
    const domain = input.email.split('@')[1]?.toLowerCase()
    const extra = new Set(input.extraDisposable ?? [])
    if (domain && (DISPOSABLE_DOMAINS.has(domain) || extra.has(domain)))
      return { ok: false, reason: 'disposable_email' }
  }
  return { ok: true }
}
