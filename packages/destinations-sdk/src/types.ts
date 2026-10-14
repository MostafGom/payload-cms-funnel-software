import type { DestinationSnapshot, DestinationType } from '@fp/contracts'

/**
 * Destination adapter contract (ADR-0010, plan §6). An adapter is pure mapping plus one HTTP
 * call: the pipeline owns retries, rate limits, consent gating, logging and replay. A new
 * platform = one package implementing this interface + golden fixtures + a mock route.
 */
export interface DeliveryEvent {
  eventId: string
  name: string
  /** platform event name from the destination's event map */
  platformEvent: string
  occurredAt: string
  pageUrl: string | null
  referrer: string | null
  source: 'browser' | 'server'
  properties: Record<string, unknown>
  clickIds: Record<string, string>
  utm: Record<string, string | null>
  ip: string | null
  userAgent: string | null
  geoCountry: string | null
  geoRegion: string | null
  anonymousId: string | null
  sessionId: string
}

/** Identity for matching. Raw values are normalized and hashed by the adapter helpers. */
export interface DeliveryUser {
  contactId: string | null
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  city: string | null
  country: string | null
  /** platform cookies / ids: fbp, fbc, ttp, scid, click:* */
  identifiers: Record<string, string>
}

export interface DeliveryContext {
  event: DeliveryEvent
  user: DeliveryUser
  destination: DestinationSnapshot
  credentials: Record<string, string>
  testMode: boolean
  /** Meta Limited Data Use applies (FR-DST-6) */
  limitedDataUse: boolean
  /** where the regime puts the visitor, for adapters that need it (LDU state) */
  region: string | null
  /** base URL override for mock servers in tests/dev */
  baseUrl?: string
}

export interface PreparedRequest {
  url: string
  method: 'POST'
  headers: Record<string, string>
  body: string
  /** safe-to-log summary for the delivery log: hashes and field presence only, never raw PII */
  summary: Record<string, unknown>
}

export type Classification =
  | { outcome: 'success' }
  | { outcome: 'retry'; reason: string; retryAfterMs?: number }
  | { outcome: 'fatal'; reason: string }

export interface DestinationAdapter {
  type: DestinationType
  /** platform supports Limited Data Use for opted-out US visitors */
  supportsLimitedDataUse: boolean
  /** credentials keys that must be present */
  requiredCredentials: string[]
  prepare(ctx: DeliveryContext): PreparedRequest
  classify(status: number, body: string, headers: Headers): Classification
}
