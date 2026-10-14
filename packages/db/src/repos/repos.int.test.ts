import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, type TestDatabase } from '@fp/testing'
import { migrate } from '../migrator.ts'
import { ensureDailyPartitions } from '../partitions.ts'
import * as repos from './index.ts'

let t: TestDatabase
const W = 1
const SID = '0199d5a4-0f6b-7c3e-9a2b-000000000001'
const AID = '0199d5a4-0f6b-7c3e-9a2b-0000000000a1'
const CID = '0199d5a4-0f6b-7c3e-9a2b-0000000000c1'
const CID2 = '0199d5a4-0f6b-7c3e-9a2b-0000000000c2'

beforeAll(async () => {
  t = await createTestDatabase()
  await migrate(t.sql)
  await ensureDailyPartitions(t.sql, 'events', {
    from: new Date('2026-10-14T00:00:00Z'),
    daysAhead: 0,
    daysBehind: 0,
  })
})
afterAll(async () => {
  await t?.drop()
})

const session = (over: Partial<repos.SessionUpsert> = {}): repos.SessionUpsert => ({
  workspaceId: W,
  sessionId: SID,
  anonymousId: null,
  contactId: null,
  startedAt: '2026-10-14T10:00:00Z',
  lastSeenAt: '2026-10-14T10:01:00Z',
  eventCount: 2,
  pageviews: 1,
  landingUrl: 'https://go.brand.com/?utm_source=meta',
  landingPath: '/',
  referrer: null,
  utmSource: 'meta',
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
  clickIds: null,
  deviceType: 'mobile',
  os: null,
  browser: null,
  geoCountry: 'us',
  isBot: false,
  converted: false,
  ...over,
})

describe('FR-TRK-4: session upserts', () => {
  it('merges deltas across batches', async () => {
    await repos.upsertSessions(t.sql, [session()])
    await repos.upsertSessions(t.sql, [
      session({
        startedAt: '2026-10-14T10:05:00Z',
        lastSeenAt: '2026-10-14T10:06:00Z',
        eventCount: 3,
        pageviews: 2,
        utmSource: 'other',
        converted: true,
        anonymousId: AID,
      }),
    ])
    const [s] = await t.sql`SELECT * FROM cdp.sessions WHERE session_id = ${SID}`
    expect(s).toMatchObject({
      event_count: 5,
      pageviews: 3,
      utm_source: 'meta',
      converted: true,
      anonymous_id: AID,
    })
    expect(new Date(s!.started_at).toISOString()).toBe('2026-10-14T10:00:00.000Z')
    expect(new Date(s!.last_seen_at).toISOString()).toBe('2026-10-14T10:06:00.000Z')
  })
})

describe('FR-TRK-4: journey upserts', () => {
  it('keeps first-reached step times and the furthest step', async () => {
    const base: repos.JourneyUpsert = {
      workspaceId: W,
      funnelId: 'f1',
      visitorKey: AID,
      anonymousId: AID,
      contactId: null,
      variantKey: 'a',
      experimentId: null,
      firstStepId: 'landing',
      furthestStepIndex: 1,
      steps: { landing: '2026-10-14T10:00:00Z', form: '2026-10-14T10:01:00Z' },
      utmSource: 'meta',
      utmCampaign: null,
      startedAt: '2026-10-14T10:00:00Z',
      lastAt: '2026-10-14T10:01:00Z',
      convertedAt: null,
    }
    await repos.upsertJourneys(t.sql, [base])
    await repos.upsertJourneys(t.sql, [
      {
        ...base,
        furthestStepIndex: 0,
        steps: { landing: '2026-10-14T11:00:00Z', thanks: '2026-10-14T11:00:05Z' },
        lastAt: '2026-10-14T11:00:05Z',
        convertedAt: '2026-10-14T11:00:00Z',
      },
    ])
    const [j] = await t.sql`SELECT * FROM cdp.funnel_journeys WHERE visitor_key = ${AID}`
    expect(j!.furthest_step_index).toBe(1)
    expect(j!.steps).toEqual({
      landing: '2026-10-14T10:00:00Z',
      form: '2026-10-14T10:01:00Z',
      thanks: '2026-10-14T11:00:05Z',
    })
    expect(j!.converted_at).not.toBeNull()
  })
})

describe('FR-TRK-5: identity linking and backfill', () => {
  it('links once, backfills history, and keeps the first link', async () => {
    await t.sql`INSERT INTO cdp.events (event_id, received_at, occurred_at, name, schema_v, source, session_id, anonymous_id, consent)
      VALUES ('0199d5a4-0f6b-7c3e-9a2b-00000000e001', '2026-10-14T10:00:00Z', '2026-10-14T10:00:00Z', 'page_viewed', 1, 'browser', ${SID}, ${AID}, 7)`
    const r = await repos.linkIdentity(t.sql, {
      workspaceId: W,
      anonymousId: AID,
      contactId: CID,
      source: 'form',
    })
    expect(r).toEqual({ linked: true, contactId: CID, backfilled: 1 })
    const again = await repos.linkIdentity(t.sql, {
      workspaceId: W,
      anonymousId: AID,
      contactId: CID2,
      source: 'form',
    })
    expect(again).toMatchObject({ linked: false, contactId: CID })
    expect((await repos.resolveContacts(t.sql, W, [AID])).get(AID)).toBe(CID)
    const [s] = await t.sql`SELECT contact_id FROM cdp.sessions WHERE session_id = ${SID}`
    expect(s!.contact_id).toBe(CID)
  })

  it('FR-DST-5: remembers the latest platform identifiers', async () => {
    await repos.upsertContactIdentifiers(t.sql, W, CID, [
      { kind: 'fbp', value: 'fb.1.1.1' },
      { kind: 'fbc', value: 'fb.1.1.X' },
    ])
    expect(await repos.latestIdentifiers(t.sql, CID)).toEqual({ fbp: 'fb.1.1.1', fbc: 'fb.1.1.X' })
  })
})

describe('ADR-0006: outbox relay', () => {
  it('publishes handled messages and backs off failures', async () => {
    await repos.insertOutbox(t.sql, [
      { id: '0199d5a4-0f6b-7c3e-9a2b-0000000000b1', workspaceId: W, topic: 'a', payload: { n: 1 } },
      { id: '0199d5a4-0f6b-7c3e-9a2b-0000000000b2', workspaceId: W, topic: 'b', payload: { n: 2 } },
    ])
    const seen: string[] = []
    const r = await repos.relayOutbox(t.sql, 10, async (msgs) => {
      seen.push(...msgs.map((m) => m.topic))
      return new Map([['0199d5a4-0f6b-7c3e-9a2b-0000000000b2', 'boom']])
    })
    expect(seen.sort()).toEqual(['a', 'b'])
    expect(r).toEqual({ published: 1, failed: 1 })
    // the failed one is not due yet
    const r2 = await repos.relayOutbox(t.sql, 10, async () => new Map())
    expect(r2).toEqual({ published: 0, failed: 0 })
    const [b] = await t.sql`SELECT attempts, last_error FROM cdp.outbox WHERE topic = 'b'`
    expect(b).toMatchObject({ attempts: 1, last_error: 'boom' })
  })
})

describe('FR-EML-2: enrollments', () => {
  it('allows one active enrollment per contact and sequence', async () => {
    const e = {
      workspaceId: W,
      contactId: CID,
      sequenceId: 's1',
      nextRunAt: '2026-10-14T00:00:00Z',
      trigger: {},
    }
    expect(await repos.enroll(t.sql, { ...e, id: '0199d5a4-0f6b-7c3e-9a2b-0000000000d1' })).toBe(
      true,
    )
    expect(await repos.enroll(t.sql, { ...e, id: '0199d5a4-0f6b-7c3e-9a2b-0000000000d2' })).toBe(
      false,
    )
    const due = await repos.withDueEnrollments(
      t.sql,
      '2026-10-15T00:00:00Z',
      10,
      async (rows) => rows,
    )
    expect(due.map((d) => d.sequence_id)).toEqual(['s1'])
    expect(await repos.exitEnrollments(t.sql, CID, 'unsubscribed')).toBe(1)
  })

  it('FR-EML-4: suppression list', async () => {
    await repos.suppress(t.sql, { workspaceId: W, emailHash: 'h1', reason: 'bounce' })
    expect(await repos.isSuppressed(t.sql, W, 'h1')).toBe('bounce')
    await repos.unsuppress(t.sql, W, 'h1') // bounces are not lifted by a resubscribe
    expect(await repos.isSuppressed(t.sql, W, 'h1')).toBe('bounce')
  })
})
