/** Redis Stream names and entry encoding shared by producers and consumers (ADR-0006). */
export const STREAMS = {
  ingest: 'ingest:events',
  ingestDlq: 'ingest:dlq',
} as const

export const CONSUMER_GROUPS = {
  pgWriter: 'pg-writer',
} as const

/** Single field holding the JSON-encoded EnrichedEvent. */
export const STREAM_FIELD = 'e'

/** Upper bound on stream length; consumers normally keep it near zero (alerts fire long before). */
export const INGEST_STREAM_MAXLEN = 2_000_000
