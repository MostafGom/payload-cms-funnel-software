import { isbot } from 'isbot'
import { UAParser } from 'ua-parser-js'
import type { EffectiveConsent } from '@fp/consent'
import type { EnrichedEvent, EventEnvelope } from '@fp/event-schemas'
import { encodeConsent } from '@fp/event-schemas'
import { truncateIp } from '@fp/platform/crypto'

export interface RequestFacts {
  workspaceId: number
  receivedAt: Date
  sentAt: Date
  ip: string | null
  userAgent: string | null
  country: string | null
  cookies: Record<string, string>
  anonymousId: string | null
  traceparent?: string
  /** server-resolved consent; falls back to the client claim when absent (tests) */
  consent?: EffectiveConsent
  region?: string
}

/** Clock skew below this is noise and ignored. */
const SKEW_TOLERANCE_MS = 5_000

/**
 * Pure enrichment (no I/O) so it is trivially unit-testable and fast on the hot path.
 * Geo comes from the edge header for now; MaxMind lookup lands in Phase 1A (FR-TRK-3).
 */
export function enrichEvent(e: EventEnvelope, f: RequestFacts): EnrichedEvent {
  const ua = f.userAgent ? new UAParser(f.userAgent).getResult() : null
  const skew = f.receivedAt.getTime() - f.sentAt.getTime()
  const occurred =
    new Date(e.occurred_at).getTime() + (Math.abs(skew) > SKEW_TOLERANCE_MS ? skew : 0)
  // Never trust a client timestamp from the future.
  const corrected = new Date(Math.min(occurred, f.receivedAt.getTime()))

  const consent = f.consent
    ? { a: f.consent.analytics, m: f.consent.marketing }
    : { a: e.context.consent?.a ?? false, m: e.context.consent?.m ?? false }
  return {
    ...e,
    anonymous_id:
      f.consent && !f.consent.analytics
        ? undefined
        : (e.anonymous_id ?? f.anonymousId ?? undefined),
    workspace_id: f.workspaceId,
    source: 'browser',
    received_at: f.receivedAt.toISOString(),
    occurred_at_corrected: corrected.toISOString(),
    ip: f.ip,
    ip_trunc: truncateIp(f.ip),
    user_agent: f.userAgent,
    device: {
      type: ua ? (ua.device.type ?? 'desktop') : null,
      os: ua?.os.name ?? null,
      browser: ua?.browser.name ?? null,
    },
    geo: {
      country: f.country,
      region: f.region?.includes('-') ? f.region.slice(3) : null,
      city: null,
    },
    is_bot: f.userAgent ? isbot(f.userAgent) : true,
    consent_mask: encodeConsent({ analytics: consent.a, marketing: consent.m }),
    cookies: f.cookies,
    traceparent: f.traceparent,
    region: f.region,
    regime: f.consent?.regime,
    gpc: f.consent?.gpc,
  }
}
