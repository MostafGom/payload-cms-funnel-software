import type { EnrichedEvent } from '@fp/event-schemas'

/** Side-effect ports, injected so the HTTP layer is testable without Valkey. */
export interface EventSink {
  /** Returns the subset of events not seen before (dedupe) after appending them to the stream. */
  publish(events: EnrichedEvent[]): Promise<{ accepted: number; duplicates: number }>
  ping(): Promise<boolean>
}

export interface RateLimiter {
  /** Returns false when `key` exceeded its budget for the current window. */
  consume(key: string, cost: number): Promise<boolean>
}
