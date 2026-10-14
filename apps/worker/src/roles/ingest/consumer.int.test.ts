import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createDb, ensureDailyPartitions, migrate, type Db, type Sql } from '@fp/db'
import { STREAM_FIELD } from '@fp/event-schemas'
import { createLogger } from '@fp/platform/logger'
import { createTestDatabase, createTestRedis, type TestDatabase, type TestRedis } from '@fp/testing'
import { createIngestConsumer } from './consumer.ts'
import { enrichedEvent } from './fixtures.ts'

let tdb: TestDatabase
let tr: TestRedis
let sql: Sql
let db: Db
const logger = createLogger({ service: 'test', level: 'silent' })

beforeAll(async () => {
  tdb = await createTestDatabase()
  await migrate(tdb.sql)
  await ensureDailyPartitions(tdb.sql, 'events')
  ;({ sql, db } = createDb(tdb.url, { max: 2 }))
  tr = await createTestRedis()
})
afterAll(async () => {
  await sql?.end()
  await tdb?.drop()
  await tr?.close()
})

let stream: string
let dlqStream: string
beforeEach(() => {
  stream = `${tr.prefix}ingest:${Math.random().toString(36).slice(2)}`
  dlqStream = `${stream}:dlq`
})

const consumerFor = (name: string, over: Record<string, unknown> = {}) =>
  createIngestConsumer({
    redis: tr.redis,
    sql,
    db,
    logger,
    consumer: name,
    stream,
    dlqStream,
    blockMs: 10,
    ...over,
  })

const add = (payload: unknown) =>
  tr.redis.xadd(
    stream,
    '*',
    STREAM_FIELD,
    typeof payload === 'string' ? payload : JSON.stringify(payload),
  )
const count = async (id: string) =>
  (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM cdp.events WHERE event_id = ${id}`)[0]!
    .n

describe('ADR-0006: ingest consumer', () => {
  it('inserts a batch, acks and trims the stream', async () => {
    const c = consumerFor('a')
    await c.ensureGroup()
    const events = [enrichedEvent(), enrichedEvent(), enrichedEvent()]
    for (const e of events) await add(e)

    expect(await c.pollOnce()).toMatchObject({ inserted: 3, dlq: 0 })
    for (const e of events) expect(await count(e.event_id)).toBe(1)
    expect(await tr.redis.xlen(stream)).toBe(0)
  })

  it('NFR-8: re-delivered events do not create duplicates', async () => {
    const c = consumerFor('a')
    await c.ensureGroup()
    const e = enrichedEvent()
    await add(e)
    await add(e)
    await c.pollOnce()
    expect(await count(e.event_id)).toBe(1)
  })

  it('moves unparseable entries to the DLQ without blocking good ones', async () => {
    const c = consumerFor('a')
    await c.ensureGroup()
    const good = enrichedEvent()
    await add('{not json')
    await add(good)
    expect(await c.pollOnce()).toMatchObject({ inserted: 1, dlq: 1 })
    expect(await count(good.event_id)).toBe(1)
    expect(await tr.redis.xlen(dlqStream)).toBe(1)
  })

  it('creates a missing partition on the fly for out-of-window events', async () => {
    const c = consumerFor('a')
    await c.ensureGroup()
    const e = enrichedEvent({
      received_at: '2031-06-15T08:00:00.000Z',
      occurred_at_corrected: '2031-06-15T08:00:00.000Z',
    })
    await add(e)
    expect(await c.pollOnce()).toMatchObject({ inserted: 1 })
    expect(await count(e.event_id)).toBe(1)
  })

  it('reclaims entries left pending by a crashed consumer', async () => {
    const crashed = consumerFor('crashed')
    await crashed.ensureGroup()
    const e = enrichedEvent()
    await add(e)
    // Simulate a consumer that read the entry and died before acking.
    await tr.redis.xreadgroup('GROUP', 'pg-writer', 'crashed', 'COUNT', 10, 'STREAMS', stream, '>')

    const survivor = consumerFor('survivor', { claimIdleMs: 0 })
    expect(await survivor.reclaimOnce()).toMatchObject({ inserted: 1 })
    expect(await count(e.event_id)).toBe(1)
  })
})
