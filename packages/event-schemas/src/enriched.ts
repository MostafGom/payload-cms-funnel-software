import type { EventEnvelope } from './envelope.ts'

/**
 * Shape the collector writes to the `ingest:events` stream. `ip` and `user_agent` are full values
 * kept only in transit for server-side destinations; storage keeps `ip_trunc` (ADR-0012).
 */
export interface EnrichedEvent extends EventEnvelope {
  workspace_id: number
  source: 'browser' | 'server'
  received_at: string
  /** occurred_at corrected for client clock skew using sent_at vs received_at */
  occurred_at_corrected: string
  ip: string | null
  ip_trunc: string | null
  user_agent: string | null
  device: { type: string | null; os: string | null; browser: string | null }
  geo: { country: string | null; region: string | null; city: string | null }
  is_bot: boolean
  consent_mask: number
  /** first-party cookie values captured server-side (fbp, fbc, ttp, scid, …) */
  cookies: Record<string, string>
  /** W3C traceparent so one trace spans collector -> ingest -> destinations (ADR-0018) */
  traceparent?: string
  /** set on server events whose contact is already known (form submissions) */
  contact_id?: string
  /**
   * Full IP encrypted at rest while the event waits in the outbox (ADR-0012); the relay decrypts
   * it into `ip` for the transient stream hop only.
   */
  ip_enc?: string
  /** region code (`DE`, `US-CA`) and regime resolved server-side (FR-CNS-3) */
  region?: string
  regime?: 'opt_in' | 'opt_out' | 'notice'
  gpc?: boolean
}
