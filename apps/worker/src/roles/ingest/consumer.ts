import { ensureDailyPartitions, repos, type schema, type Db, type Sql } from '@fp/db'
import type { EnrichedEvent } from '@fp/event-schemas'
import { CONSUMER_GROUPS, STREAM_FIELD, STREAMS } from '@fp/event-schemas'
import type { Logger } from '@fp/platform/logger'
import {
  linksFromTraceparents,
  metrics,
  SpanKind,
  trace,
  withSpan,
  type Tracer,
} from '@fp/platform/otel'
import type { Redis } from '@fp/platform/redis'
import { toEventRow } from './map.ts'

type StreamEntry = [id: string, fields: string[]]

export interface IngestConsumerOptions {
  redis: Redis
  sql: Sql
  /** kept for callers that need typed queries */
  db?: Db
  logger: Logger
  tracer?: Tracer
  consumer: string
  stream?: string
  dlqStream?: string
  group?: string
  batchSize?: number
  blockMs?: number
  /** pending entries idle longer than this are reclaimed from crashed consumers */
  claimIdleMs?: number
  /** after this many deliveries an entry is moved to the DLQ */
  maxDeliveries?: number
  /**
   * Read-model hook (sessions, journeys, identity, consent, fan-out). Runs in the SAME transaction
   * as the insert and only sees newly inserted events, so retries never double count. It may
   * return a callback that runs after commit (e.g. enqueueing BullMQ jobs).
   */
  afterInsert?: (tx: Sql, inserted: Ingested[]) => Promise<(() => Promise<void>) | void>
}

export interface Ingested {
  row: schema.EventRow
  event: EnrichedEvent
}

export interface BatchResult {
  inserted: number
  dlq: number
  retried: number
}

/**
 * ADR-0006 hot path: XREADGROUP batch -> map -> multi-row INSERT ON CONFLICT DO NOTHING -> XACK+XDEL.
 * At-least-once delivery from the stream plus idempotent insert = effectively-once storage (NFR-8).
 */
export function createIngestConsumer(o: IngestConsumerOptions) {
  const stream = o.stream ?? STREAMS.ingest
  const dlq = o.dlqStream ?? STREAMS.ingestDlq
  const group = o.group ?? CONSUMER_GROUPS.pgWriter
  const batchSize = o.batchSize ?? 500
  const claimIdleMs = o.claimIdleMs ?? 60_000
  const maxDeliveries = o.maxDeliveries ?? 5
  const tracer = o.tracer ?? trace.getTracer('worker')
  const lag = metrics.getMeter('worker').createHistogram('fp_ingest_lag_ms', {
    unit: 'ms',
    description: 'Collector accept -> stored (NFR-3)',
  })

  async function ensureGroup(): Promise<void> {
    try {
      await o.redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM')
    } catch (err) {
      if (!String(err).includes('BUSYGROUP')) throw err
    }
  }

  /** One transaction: insert (dedupe on PK) + read models for the rows that were new. */
  async function insert(items: Ingested[]): Promise<void> {
    if (!items.length) return
    const after = await o.sql.begin(async (tx) => {
      const t = tx as unknown as Sql
      const fresh = await repos.insertEvents(
        t,
        items.map((i) => i.row),
      )
      return o.afterInsert?.(
        t,
        items.filter((i) => fresh.has(i.row.eventId)),
      )
    })
    if (typeof after === 'function') {
      try {
        await after()
      } catch (err) {
        // Post-commit work is re-driven by sweepers (e.g. pending deliveries); never re-insert.
        o.logger.error({ err }, 'post-commit hook failed')
      }
    }
  }

  async function insertWithPartitionRepair(items: Ingested[]): Promise<void> {
    try {
      await insert(items)
    } catch (err) {
      if (!isMissingPartition(err)) throw err
      // Late/early events outside the pre-created window: create their partitions and retry once.
      const days = new Set(items.map((r) => r.row.receivedAt.slice(0, 10)))
      for (const d of days)
        await ensureDailyPartitions(o.sql, 'events', {
          from: new Date(`${d}T00:00:00Z`),
          daysAhead: 0,
          daysBehind: 0,
        })
      await insert(items)
    }
  }

  async function handle(entries: StreamEntry[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, dlq: 0, retried: 0 }
    if (!entries.length) return result

    const parsed: { id: string; row: schema.EventRow; event: EnrichedEvent }[] = []
    const toDlq: { id: string; payload: string; error: string }[] = []
    const traceparents: (string | undefined)[] = []
    for (const [id, fields] of entries) {
      const payload = fields[fields.indexOf(STREAM_FIELD) + 1] ?? ''
      try {
        const event = JSON.parse(payload) as EnrichedEvent
        traceparents.push(event.traceparent)
        parsed.push({ id, row: toEventRow(event), event })
      } catch (err) {
        toDlq.push({ id, payload, error: `parse: ${String(err)}` })
      }
    }

    // A batch span linked to every producer trace keeps collector -> storage traceable (NFR-14).
    return withSpan(
      tracer,
      'ingest.batch',
      {
        kind: SpanKind.CONSUMER,
        links: linksFromTraceparents(traceparents),
        attributes: { 'messaging.batch.message_count': entries.length },
      },
      async (span) => {
        await store(parsed, toDlq, result)
        span.setAttributes({ 'ingest.inserted': result.inserted, 'ingest.dlq': result.dlq })
        return result
      },
    )
  }

  async function store(
    parsed: { id: string; row: schema.EventRow; event: EnrichedEvent }[],
    toDlq: { id: string; payload: string; error: string }[],
    result: BatchResult,
  ): Promise<void> {
    const done: string[] = []
    try {
      await insertWithPartitionRepair(parsed)
      done.push(...parsed.map((p) => p.id))
      result.inserted = parsed.length
      const now = Date.now()
      for (const p of parsed) lag.record(now - new Date(p.row.receivedAt).getTime())
    } catch (batchErr) {
      // Database unavailable is not a poison message: keep everything pending and retry later,
      // so an outage can never push good events into the DLQ (NFR-8, resilience test).
      if (isTransientDbError(batchErr)) throw batchErr
      o.logger.warn({ err: batchErr, size: parsed.length }, 'batch insert failed; isolating rows')
      // Isolate poison rows so one bad event cannot block the stream.
      const deliveries = await deliveryCounts(parsed.map((p) => p.id))
      for (const p of parsed) {
        try {
          await insertWithPartitionRepair([p])
          done.push(p.id)
          result.inserted++
        } catch (rowErr) {
          if (isTransientDbError(rowErr)) throw rowErr
          if ((deliveries.get(p.id) ?? 1) >= maxDeliveries) {
            toDlq.push({ id: p.id, payload: JSON.stringify(p.row), error: String(rowErr) })
          } else {
            result.retried++ // left pending; XAUTOCLAIM redelivers it later
          }
        }
      }
    }

    if (toDlq.length) {
      const pipe = o.redis.pipeline()
      for (const d of toDlq)
        pipe.xadd(
          dlq,
          '*',
          'source_id',
          d.id,
          'error',
          d.error.slice(0, 1000),
          STREAM_FIELD,
          d.payload,
        )
      await pipe.exec()
      done.push(...toDlq.map((d) => d.id))
      result.dlq = toDlq.length
      o.logger.error({ count: toDlq.length }, 'events moved to DLQ')
    }

    if (done.length) {
      // XDEL keeps the stream small; history lives in Postgres.
      await o.redis
        .multi()
        .xack(stream, group, ...done)
        .xdel(stream, ...done)
        .exec()
    }
  }

  async function deliveryCounts(ids: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    if (!ids.length) return counts
    const pending = (await o.redis.xpending(stream, group, '-', '+', ids.length * 10)) as [
      string,
      string,
      number,
      number,
    ][]
    for (const [id, , , n] of pending) counts.set(id, n)
    return counts
  }

  /** Reads one batch of new entries. */
  async function pollOnce(): Promise<BatchResult> {
    const res = (await o.redis.xreadgroup(
      'GROUP',
      group,
      o.consumer,
      'COUNT',
      batchSize,
      'BLOCK',
      o.blockMs ?? 200,
      'STREAMS',
      stream,
      '>',
    )) as [string, StreamEntry[]][] | null
    return handle(res?.[0]?.[1] ?? [])
  }

  /** Reclaims entries left pending by crashed consumers (or rows awaiting retry). */
  async function reclaimBatch(): Promise<{ result: BatchResult; entries: number }> {
    const [, entries] = (await o.redis.xautoclaim(
      stream,
      group,
      o.consumer,
      claimIdleMs,
      '0-0',
      'COUNT',
      batchSize,
    )) as [string, StreamEntry[]]
    const live = entries.filter((e) => e[1] !== null)
    return { result: await handle(live), entries: entries.length }
  }

  async function reclaimOnce(): Promise<BatchResult> {
    return (await reclaimBatch()).result
  }

  async function run(signal: AbortSignal): Promise<void> {
    await ensureGroup()
    let lastReclaim = 0
    while (!signal.aborted) {
      try {
        if (Date.now() - lastReclaim > claimIdleMs / 2) {
          // Drain the whole backlog after an outage: keep reclaiming while batches come back full.
          let r: BatchResult
          let entries: number
          do {
            ;({ result: r, entries } = await reclaimBatch())
            if (r.inserted) o.logger.debug(r, 'reclaimed batch')
          } while (entries >= batchSize && !signal.aborted)
          lastReclaim = Date.now()
        }
        const r = await pollOnce()
        if (r.inserted) o.logger.debug(r, 'ingest batch')
      } catch (err) {
        o.logger.error({ err }, 'ingest loop error')
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  return { ensureGroup, pollOnce, reclaimOnce, run }
}

/** Postgres 23514 "no partition of relation ... found"; drizzle wraps it in DrizzleQueryError.cause. */
function isMissingPartition(err: unknown): boolean {
  for (
    let e = err as { code?: string; message?: string; cause?: unknown } | undefined;
    e;
    e = e.cause as typeof e
  ) {
    if (e.code === '23514' && e.message?.includes('no partition')) return true
  }
  return false
}

const TRANSIENT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'CONNECTION_ENDED',
  'CONNECTION_CLOSED',
  'CONNECTION_DESTROYED',
  'CONNECT_TIMEOUT',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '40001',
  '40P01',
])

/** Connection loss, server shutdown, too many connections, serialization/deadlock: retry. */
export function isTransientDbError(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code && (TRANSIENT_CODES.has(e.code) || e.code.startsWith('08'))) return true
  }
  return false
}
