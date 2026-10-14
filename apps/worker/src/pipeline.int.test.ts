import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DestinationSnapshot, EmailSequenceSnapshot, SegmentSnapshot } from '@fp/contracts'
import { createDb, ensureDailyPartitions, migrate, repos, type Sql } from '@fp/db'
import { STREAM_FIELD, type EnrichedEvent } from '@fp/event-schemas'
import type { EmailProvider, OutgoingEmail } from '@fp/email-providers'
import { encryptSecret, parseKeyring, sha256Hex } from '@fp/platform/crypto'
import { createLogger } from '@fp/platform/logger'
import { metrics } from '@fp/platform/otel'
import {
  createCmsStub,
  createTestDatabase,
  createTestRedis,
  type TestDatabase,
  type TestRedis,
} from '@fp/testing'
import type { DeliveryJob, EmailJob, Queues } from './lib/queues.ts'
import { createSnapshotCache } from './lib/snapshots.ts'
import { deliver } from './roles/destinations/deliver.ts'
import { sendEmail } from './roles/email/send.ts'
import { createIngestConsumer } from './roles/ingest/consumer.ts'
import { enrichedEvent } from './roles/ingest/fixtures.ts'
import { createReadModels } from './roles/ingest/readmodels.ts'
import { createRelay } from './roles/relay/relay.ts'
import { runSequences, runSegments } from './roles/scheduler/jobs.ts'
import { recomputeSegment } from './roles/segments/compute.ts'

/**
 * Worker pipeline integration (NFR-13): ingest read models + fan-out, delivery outcomes, relay,
 * the sequence engine on a time-travel clock (Phase 3 exit) and segment diffs. Throwaway database
 * with the cdp schema and the cms read-model stub; Valkey keys under a unique prefix.
 */
const logger = createLogger({ service: 'test', level: 'silent' })
const keyring = parseKeyring(`k1:${Buffer.alloc(32, 7).toString('base64')}`, 'k1')
let tdb: TestDatabase
let tr: TestRedis
let sql: Sql

const deliveryJobs: DeliveryJob[] = []
const emailJobs: EmailJob[] = []
const queues = {
  enqueueDeliveries: async (j: DeliveryJob[]) => void deliveryJobs.push(...j),
  enqueueEmail: async (j: EmailJob) => void emailJobs.push(j),
  delivery: () => ({ remove: async () => 0 }),
  email: () => ({}),
  close: async () => {},
} as unknown as Queues

const CONTACT = '0199d5a4-0f6b-7c3e-9a2b-0000000000c1'
const ANON = '0199d5a4-0f6b-7c3e-9a2b-aaaaaaaaaaaa'
const FUNNEL = 'funnel-1'

async function snapshot(kind: string, id: string, data: object) {
  await repos.upsertSnapshot(sql, { kind, id, data: data as Record<string, unknown> })
}

const dest = (
  type: DestinationSnapshot['type'],
  over: Partial<DestinationSnapshot> = {},
): DestinationSnapshot => ({
  id: `dest-${type}`,
  name: type,
  type,
  enabled: true,
  testMode: false,
  pixelId: 'PIXEL',
  browserPixel: false,
  credentials: encryptSecret(
    JSON.stringify({ accessToken: 'tok', webhookSecret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw' }),
    keyring,
  ),
  endpointUrl: type === 'webhook' ? 'http://127.0.0.1:9/hook' : undefined,
  eventMap: [{ source: 'form_submitted', target: type === 'meta' ? 'Lead' : 'x', enabled: true }],
  rateLimitPerSecond: 50,
  limitedDataUse: true,
  includeBots: false,
  ...over,
})

beforeAll(async () => {
  tdb = await createTestDatabase()
  await migrate(tdb.sql)
  await createCmsStub(tdb.sql)
  await ensureDailyPartitions(tdb.sql, 'events')
  await ensureDailyPartitions(tdb.sql, 'destination_deliveries')
  ;({ sql } = createDb(tdb.url, { max: 4 }))
  tr = await createTestRedis()
  await sql`INSERT INTO cms.contacts (id, email, email_hash, first_name, phone, country, marketing_status)
    VALUES (${CONTACT}, 'ada@example.com', ${sha256Hex('ada@example.com')}, 'Ada', '+14155550123', 'US', 'subscribed')`
  await sql`INSERT INTO cdp.identity_links (anonymous_id, contact_id, source) VALUES (${ANON}, ${CONTACT}, 'form')`
  await snapshot('funnel', FUNNEL, {
    id: FUNNEL,
    name: 'f',
    steps: [
      { id: 'landing', name: 'L', type: 'landing' },
      { id: 'thanks', name: 'T', type: 'thank_you' },
    ],
  })
  for (const t of ['meta', 'tiktok', 'webhook'] as const)
    await snapshot('destination', `dest-${t}`, dest(t))
})
afterAll(async () => {
  await sql?.end()
  await tdb?.drop()
  await tr?.close()
})
beforeEach(() => {
  deliveryJobs.length = 0
  emailJobs.length = 0
})

const snapshots = () => createSnapshotCache(sql, 0)

async function ingest(events: EnrichedEvent[]) {
  const stream = `${tr.prefix}ingest:${Math.random().toString(36).slice(2)}`
  const c = createIngestConsumer({
    redis: tr.redis,
    sql,
    logger,
    consumer: 'c',
    stream,
    dlqStream: `${stream}:dlq`,
    blockMs: 10,
    afterInsert: createReadModels({ snapshots: snapshots(), queues, keyring }),
  })
  await c.ensureGroup()
  for (const e of events) await tr.redis.xadd(stream, '*', STREAM_FIELD, JSON.stringify(e))
  return c.pollOnce()
}

describe('ingest read models and fan-out', () => {
  it('FR-TRK-4/5: resolves the contact, builds the session and the journey', async () => {
    const session = '0199d5a4-0f6b-7c3e-9a2b-000000005001'
    await ingest([
      enrichedEvent({ session_id: session, funnel: { funnel_id: FUNNEL, step_id: 'landing' } }),
      enrichedEvent({
        session_id: session,
        funnel: { funnel_id: FUNNEL, step_id: 'thanks' },
        name: 'page_viewed',
      }),
    ])
    const [s] =
      await sql`SELECT contact_id, pageviews, utm_source FROM cdp.sessions WHERE session_id = ${session}`
    expect(s).toMatchObject({ contact_id: CONTACT, pageviews: 2, utm_source: 'fb' })
    const [j] =
      await sql`SELECT furthest_step_index, contact_id FROM cdp.funnel_journeys WHERE funnel_id = ${FUNNEL} AND visitor_key = ${ANON}`
    expect(j).toMatchObject({ furthest_step_index: 1, contact_id: CONTACT })
    const [e] =
      await sql`SELECT jsonb_typeof(properties) AS t FROM cdp.events WHERE session_id = ${session} LIMIT 1`
    expect(e!.t).toBe('object')
  })

  it('FR-CNS-2: banner choices become consent records', async () => {
    const e = enrichedEvent({
      name: 'consent_updated',
      properties: { analytics: true, marketing: false, policy_version: '3' },
      region: 'DE',
      regime: 'opt_in',
    })
    await ingest([e])
    const [r] =
      await sql`SELECT region, regime, analytics, marketing, policy_version FROM cdp.consent_records WHERE id = ${e.event_id}`
    expect(r).toMatchObject({
      region: 'DE',
      regime: 'opt_in',
      analytics: true,
      marketing: false,
      policy_version: '3',
    })
  })

  it('FR-DST-6: fan-out gates on consent; opted-out US visitor goes to Meta (LDU) only', async () => {
    const granted = enrichedEvent({
      name: 'form_submitted',
      source: 'server',
      contact_id: CONTACT,
      properties: { form_id: 'f' },
      regime: 'opt_out',
      consent_mask: 7,
    })
    const optIn = enrichedEvent({
      name: 'form_submitted',
      source: 'server',
      properties: { form_id: 'f' },
      regime: 'opt_in',
      consent_mask: 3,
    })
    const optedOut = enrichedEvent({
      name: 'form_submitted',
      source: 'server',
      properties: { form_id: 'f' },
      regime: 'opt_out',
      consent_mask: 3,
      gpc: true,
    })
    await ingest([granted, optIn, optedOut])
    const rows = await sql<{ event_id: string; destination_type: string; status: string }[]>`
      SELECT event_id, destination_type, status FROM cdp.destination_deliveries
      WHERE event_id = ANY(${[granted.event_id, optIn.event_id, optedOut.event_id]}::uuid[])`
    const st = (id: string, t: string) =>
      rows.find((r) => r.event_id === id && r.destination_type === t)?.status
    expect([
      st(granted.event_id, 'meta'),
      st(granted.event_id, 'tiktok'),
      st(granted.event_id, 'webhook'),
    ]).toEqual(['pending', 'pending', 'pending'])
    expect([st(optIn.event_id, 'meta'), st(optIn.event_id, 'tiktok')]).toEqual([
      'skipped_consent',
      'skipped_consent',
    ])
    expect([st(optedOut.event_id, 'meta'), st(optedOut.event_id, 'tiktok')]).toEqual([
      'pending',
      'skipped_consent',
    ])
    expect(deliveryJobs.filter((j) => j.eventId === granted.event_id)).toHaveLength(3)
    // Re-ingesting the same event creates nothing new (NFR-8).
    deliveryJobs.length = 0
    await ingest([granted])
    expect(deliveryJobs).toHaveLength(0)
  })
})

describe('FR-DST-7: delivery attempts', () => {
  const fakeFetch = (status: number, body = '{}', headers: Record<string, string> = {}) => {
    const calls: { url: string; body: string }[] = []
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) })
      return new Response(body, { status, headers })
    }) as unknown as typeof fetch
    return { f, calls }
  }
  async function pendingDelivery(
    type: 'meta' | 'tiktok' | 'webhook',
    over: Partial<EnrichedEvent> = {},
  ) {
    const e = enrichedEvent({
      name: 'form_submitted',
      source: 'server',
      contact_id: CONTACT,
      properties: { form_id: 'f' },
      regime: 'opt_out',
      consent_mask: 7,
      ...over,
    })
    await ingest([e])
    const job = deliveryJobs.find(
      (j) => j.eventId === e.event_id && j.destinationId === `dest-${type}`,
    )!
    return { e, job }
  }
  const deps = (f: typeof fetch, over: object = {}) => ({
    sql,
    snapshots: snapshots(),
    keyring,
    logger,
    baseUrls: {},
    allowPrivateWebhooks: true,
    fetch: f,
    ...over,
  })

  it('success sends hashed identifiers, the shared event id and the client IP', async () => {
    const { e, job } = await pendingDelivery('meta')
    const { f, calls } = fakeFetch(200, '{"events_received":1}')
    expect(await deliver(deps(f), job, 1)).toMatchObject({ status: 'success' })
    const body = JSON.parse(calls[0]!.body)
    expect(body.data[0]).toMatchObject({
      event_id: e.event_id,
      event_name: 'Lead',
      user_data: { em: [sha256Hex('ada@example.com')], client_ip_address: '203.0.113.77' },
    })
    const [d] =
      await sql`SELECT status, attempts, last_status_code FROM cdp.destination_deliveries WHERE delivery_id = ${job.deliveryId}`
    expect(d).toMatchObject({ status: 'success', attempts: 1, last_status_code: 200 })
    // Idempotent: a second run of the same job is a no-op.
    expect(await deliver(deps(f), job, 2)).toEqual({ status: 'noop' })
  })

  it('retries transient errors honouring Retry-After, fails permanent ones', async () => {
    const a = await pendingDelivery('tiktok')
    expect(
      await deliver(deps(fakeFetch(429, '', { 'retry-after': '120' }).f), a.job, 1),
    ).toMatchObject({ status: 'retry', delayMs: 120_000 })
    const b = await pendingDelivery('meta')
    expect(
      await deliver(
        deps(fakeFetch(400, '{"error":{"code":100,"message":"bad param"}}').f),
        b.job,
        1,
      ),
    ).toMatchObject({ status: 'failed' })
  })

  it('marks deliveries dead once the event is older than 72h', async () => {
    const { job } = await pendingDelivery('meta')
    const later = () => Date.now() + 73 * 3600 * 1000
    expect(await deliver(deps(fakeFetch(503).f, { now: later }), job, 9)).toMatchObject({
      status: 'dead',
    })
  })

  it('FR-CNS-3: a later opt-out wins at send time', async () => {
    const { e, job } = await pendingDelivery('tiktok', {
      anonymous_id: '0199d5a4-0f6b-7c3e-9a2b-bbbbbbbbbbbb',
    })
    await repos.insertConsentRecords(sql, [
      {
        id: '0199d5a4-0f6b-7c3e-9a2b-cccccccccccc',
        workspaceId: 1,
        recordedAt: new Date(Date.now() + 1000).toISOString(),
        anonymousId: e.anonymous_id!,
        contactId: null,
        sessionId: null,
        region: 'US',
        regime: 'opt_out',
        policyVersion: '1',
        bannerVersion: '1',
        analytics: true,
        marketing: false,
        gpc: false,
        source: 'banner',
        ipTrunc: null,
        userAgent: null,
      },
    ])
    expect(await deliver(deps(fakeFetch(200).f), job, 1)).toMatchObject({
      status: 'skipped_consent',
    })
  })

  it('ADR-0014: webhooks to private addresses are refused in production mode', async () => {
    const { job } = await pendingDelivery('webhook')
    expect(
      await deliver(deps(fakeFetch(200).f, { allowPrivateWebhooks: false }), job, 1),
    ).toMatchObject({ status: 'failed', reason: expect.stringContaining('unsafe_url') })
  })
})

describe('ADR-0006: relay', () => {
  it('decrypts the transit IP into the stream entry and enrolls sequence triggers', async () => {
    const stream = `${tr.prefix}relay`
    const relay = createRelay({
      sql,
      redis: tr.redis,
      queues,
      snapshots: snapshots(),
      keyring,
      logger,
      stream,
    })
    const ev = enrichedEvent({
      ip: null,
      ip_enc: encryptSecret('198.51.100.9', keyring),
      source: 'server',
    })
    const seq: EmailSequenceSnapshot = {
      id: 'seq-relay',
      name: 's',
      active: true,
      trigger: { type: 'form_submitted', formId: 'form-x' },
      steps: [{ delayAmount: 0, delayUnit: 'minutes', templateId: 't1' }],
      exit: { tagIds: [], eventNames: [] },
    }
    await snapshot('email_sequence', seq.id, seq)
    await repos.insertOutbox(sql, [
      {
        id: '0199d5a4-0f6b-7c3e-9a2b-0000000000e1',
        workspaceId: 1,
        topic: 'event.server',
        payload: ev as unknown as Record<string, unknown>,
      },
      {
        id: '0199d5a4-0f6b-7c3e-9a2b-0000000000e2',
        workspaceId: 1,
        topic: 'sequence.trigger',
        payload: { contactId: CONTACT, trigger: { type: 'form_submitted', formId: 'form-x' } },
      },
    ])
    expect(await relay.relayOnce()).toEqual({ published: 2, failed: 0 })
    const entries = (await tr.redis.xrange(stream, '-', '+')) as [string, string[]][]
    const published = JSON.parse(entries[0]![1][1]!) as EnrichedEvent
    expect(published.ip).toBe('198.51.100.9')
    expect(published.ip_enc).toBeUndefined()
    const [en] =
      await sql`SELECT status FROM cdp.email_enrollments WHERE contact_id = ${CONTACT} AND sequence_id = 'seq-relay'`
    expect(en!.status).toBe('active')
  })
})

describe('FR-EML-2 / Phase 3 exit: a 3-email sequence on a time-travel clock', () => {
  it('sends step 1 now, step 2 after 2 days, step 3 after 3 more, then completes', async () => {
    const seq: EmailSequenceSnapshot = {
      id: 'seq-tt',
      name: 'nurture',
      active: true,
      trigger: { type: 'manual' },
      steps: [
        { delayAmount: 0, delayUnit: 'minutes', templateId: 'tpl-1' },
        { delayAmount: 2, delayUnit: 'days', templateId: 'tpl-2' },
        { delayAmount: 3, delayUnit: 'days', templateId: 'tpl-3' },
      ],
      exit: { tagIds: [], eventNames: [] },
    }
    await snapshot('email_sequence', seq.id, seq)
    for (const n of [1, 2, 3])
      await snapshot('email_template', `tpl-${n}`, {
        id: `tpl-${n}`,
        name: `t${n}`,
        subject: `Email ${n} for {{firstName}}`,
        html: `<p>${n}</p>`,
        text: `${n}`,
      })
    let clock = new Date('2026-11-02T10:00:00Z')
    await repos.enroll(sql, {
      id: '0199d5a4-0f6b-7c3e-9a2b-0000000000f1',
      workspaceId: 1,
      contactId: CONTACT,
      sequenceId: seq.id,
      nextRunAt: clock.toISOString(),
      trigger: {},
    })

    const sent: OutgoingEmail[] = []
    const provider: EmailProvider = {
      name: 'smtp',
      send: async (m) => (sent.push(m), { providerMessageId: `p${sent.length}` }),
    }
    const emailDeps = {
      sql,
      snapshots: snapshots(),
      keyring,
      logger,
      publicBaseUrl: 'https://brand.test',
      linkSecret: 'x'.repeat(32),
      smtp: { host: 'x', port: 1 },
    }
    const tick = async () => {
      await runSequences({
        sql,
        redis: tr.redis,
        queues,
        snapshots: snapshots(),
        logger,
        meter: metrics.getMeter('t'),
        now: () => clock,
      })
      for (const j of emailJobs.splice(0)) await sendEmail(emailDeps, j, provider)
    }

    await tick()
    expect(sent.map((m) => m.subject)).toEqual(['Email 1 for Ada'])
    clock = new Date(clock.getTime() + 86_400_000) // +1 day: nothing due
    await tick()
    expect(sent).toHaveLength(1)
    clock = new Date('2026-11-04T10:00:01Z') // +2 days
    await tick()
    clock = new Date('2026-11-07T10:00:02Z') // +3 more days
    await tick()
    await tick() // already completed: no duplicates
    expect(sent.map((m) => m.subject)).toEqual([
      'Email 1 for Ada',
      'Email 2 for Ada',
      'Email 3 for Ada',
    ])
    expect(sent[0]!.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    const [en] =
      await sql`SELECT status, current_step FROM cdp.email_enrollments WHERE sequence_id = 'seq-tt'`
    expect(en).toMatchObject({ status: 'completed', current_step: 3 })
    const msgs = await sql`SELECT status FROM cdp.email_messages WHERE sequence_id = 'seq-tt'`
    expect(msgs.map((m) => m.status)).toEqual(['sent', 'sent', 'sent'])
  })

  it('FR-EML-4: suppressed addresses get no marketing mail', async () => {
    await repos.suppress(sql, {
      workspaceId: 1,
      emailHash: sha256Hex('ada@example.com'),
      reason: 'bounce',
    })
    const provider: EmailProvider = { name: 'smtp', send: async () => ({ providerMessageId: 'x' }) }
    const r = await sendEmail(
      {
        sql,
        snapshots: snapshots(),
        keyring,
        logger,
        publicBaseUrl: 'https://b',
        linkSecret: 'x'.repeat(32),
        smtp: { host: 'x', port: 1 },
      },
      {
        kind: 'sequence',
        contactId: CONTACT,
        templateId: 'tpl-1',
        messageId: '0199d5a4-0f6b-7c3e-9a2b-0000000000f9',
      },
      provider,
    )
    expect(r).toBe('suppressed')
    await sql`DELETE FROM cdp.email_suppressions`
  })
})

describe('FR-CRM-6: segments', () => {
  it('computes membership, then emits exits when a contact stops matching', async () => {
    const seg: SegmentSnapshot = {
      id: 'seg-us',
      name: 'US subscribers',
      rules: {
        type: 'group',
        op: 'and',
        conditions: [{ type: 'attribute', field: 'country', operator: 'eq', value: 'US' }],
      },
      recomputeMinutes: 5,
    }
    const deps = { sql, redis: tr.redis, snapshots: snapshots() }
    expect(await recomputeSegment(deps, seg, { emitEvents: false })).toMatchObject({
      entered: 1,
      total: 1,
    })
    await sql`UPDATE cms.contacts SET country = 'DE' WHERE id = ${CONTACT}`
    expect(await recomputeSegment(deps, seg, { emitEvents: false })).toMatchObject({
      exited: 1,
      total: 0,
    })
    await sql`UPDATE cms.contacts SET country = 'US' WHERE id = ${CONTACT}`
    await snapshot('segment', seg.id, seg)
    await tr.redis.del(`seg:last:${seg.id}`) // state from earlier runs must not skip the recompute
    await runSegments({
      sql,
      redis: tr.redis,
      queues,
      snapshots: snapshots(),
      logger,
      meter: metrics.getMeter('t'),
    })
    const [m] =
      await sql`SELECT count(*)::int AS n FROM cdp.segment_memberships WHERE segment_id = 'seg-us'`
    expect(m!.n).toBe(1)
  })
})
