import type { Sql } from '../client.ts'
import { bulkInsert, type BulkColumn } from './bulk.ts'

/** Session delta as produced by @fp/tracking (structural type: db does not depend on modules). */
export interface SessionUpsert {
  workspaceId: number
  sessionId: string
  anonymousId: string | null
  contactId: string | null
  startedAt: string
  lastSeenAt: string
  eventCount: number
  pageviews: number
  landingUrl: string | null
  landingPath: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  clickIds: Record<string, string> | null
  deviceType: string | null
  os: string | null
  browser: string | null
  geoCountry: string | null
  isBot: boolean
  converted: boolean
}

/** Merges deltas: counts add, the time window widens, first-touch fields keep their first value. */
export async function upsertSessions(sql: Sql, rows: SessionUpsert[]): Promise<void> {
  if (!rows.length) return
  const values = rows.map((r) => ({
    workspace_id: r.workspaceId,
    session_id: r.sessionId,
    anonymous_id: r.anonymousId,
    contact_id: r.contactId,
    started_at: r.startedAt,
    last_seen_at: r.lastSeenAt,
    event_count: r.eventCount,
    pageviews: r.pageviews,
    landing_url: r.landingUrl,
    landing_path: r.landingPath,
    referrer: r.referrer,
    utm_source: r.utmSource,
    utm_medium: r.utmMedium,
    utm_campaign: r.utmCampaign,
    utm_term: r.utmTerm,
    utm_content: r.utmContent,
    click_ids: r.clickIds,
    device_type: r.deviceType,
    os: r.os,
    browser: r.browser,
    geo_country: r.geoCountry?.slice(0, 2) ?? null,
    is_bot: r.isBot,
    converted: r.converted,
  }))
  await bulkInsert(
    sql,
    'cdp.sessions',
    SESSION_COLUMNS,
    values,
    `
    ON CONFLICT (session_id) DO UPDATE SET
      anonymous_id = COALESCE(cdp.sessions.anonymous_id, EXCLUDED.anonymous_id),
      contact_id   = COALESCE(cdp.sessions.contact_id, EXCLUDED.contact_id),
      started_at   = LEAST(cdp.sessions.started_at, EXCLUDED.started_at),
      last_seen_at = GREATEST(cdp.sessions.last_seen_at, EXCLUDED.last_seen_at),
      event_count  = cdp.sessions.event_count + EXCLUDED.event_count,
      pageviews    = cdp.sessions.pageviews + EXCLUDED.pageviews,
      landing_url  = COALESCE(cdp.sessions.landing_url, EXCLUDED.landing_url),
      landing_path = COALESCE(cdp.sessions.landing_path, EXCLUDED.landing_path),
      referrer     = COALESCE(cdp.sessions.referrer, EXCLUDED.referrer),
      utm_source   = COALESCE(cdp.sessions.utm_source, EXCLUDED.utm_source),
      utm_medium   = COALESCE(cdp.sessions.utm_medium, EXCLUDED.utm_medium),
      utm_campaign = COALESCE(cdp.sessions.utm_campaign, EXCLUDED.utm_campaign),
      utm_term     = COALESCE(cdp.sessions.utm_term, EXCLUDED.utm_term),
      utm_content  = COALESCE(cdp.sessions.utm_content, EXCLUDED.utm_content),
      click_ids    = COALESCE(cdp.sessions.click_ids, EXCLUDED.click_ids),
      is_bot       = cdp.sessions.is_bot OR EXCLUDED.is_bot,
      converted    = cdp.sessions.converted OR EXCLUDED.converted`,
  )
}

const SESSION_COLUMNS: BulkColumn[] = [
  { name: 'workspace_id', cast: 'int' },
  { name: 'session_id', cast: 'uuid' },
  { name: 'anonymous_id', cast: 'uuid' },
  { name: 'contact_id', cast: 'uuid' },
  { name: 'started_at', cast: 'timestamptz' },
  { name: 'last_seen_at', cast: 'timestamptz' },
  { name: 'event_count', cast: 'int' },
  { name: 'pageviews', cast: 'int' },
  { name: 'landing_url' },
  { name: 'landing_path' },
  { name: 'referrer' },
  { name: 'utm_source' },
  { name: 'utm_medium' },
  { name: 'utm_campaign' },
  { name: 'utm_term' },
  { name: 'utm_content' },
  { name: 'click_ids', cast: 'jsonb' },
  { name: 'device_type' },
  { name: 'os' },
  { name: 'browser' },
  { name: 'geo_country', cast: 'char2' },
  { name: 'is_bot', cast: 'bool' },
  { name: 'converted', cast: 'bool' },
]

export interface JourneyUpsert {
  workspaceId: number
  funnelId: string
  visitorKey: string
  anonymousId: string | null
  contactId: string | null
  variantKey: string | null
  experimentId: string | null
  firstStepId: string | null
  furthestStepIndex: number
  steps: Record<string, string>
  utmSource: string | null
  utmCampaign: string | null
  startedAt: string
  lastAt: string
  convertedAt: string | null
}

export async function upsertJourneys(sql: Sql, rows: JourneyUpsert[]): Promise<void> {
  if (!rows.length) return
  const values = rows.map((r) => ({
    workspace_id: r.workspaceId,
    funnel_id: r.funnelId,
    visitor_key: r.visitorKey,
    anonymous_id: r.anonymousId,
    contact_id: r.contactId,
    variant_key: r.variantKey,
    experiment_id: r.experimentId,
    first_step_id: r.firstStepId,
    furthest_step_index: r.furthestStepIndex,
    steps: r.steps,
    utm_source: r.utmSource,
    utm_campaign: r.utmCampaign,
    started_at: r.startedAt,
    last_at: r.lastAt,
    converted_at: r.convertedAt,
  }))
  // Existing keys win in `||` order below, so the first time a step was reached is preserved.
  await bulkInsert(
    sql,
    'cdp.funnel_journeys',
    JOURNEY_COLUMNS,
    values,
    `
    ON CONFLICT (workspace_id, funnel_id, visitor_key) DO UPDATE SET
      contact_id          = COALESCE(cdp.funnel_journeys.contact_id, EXCLUDED.contact_id),
      variant_key         = COALESCE(cdp.funnel_journeys.variant_key, EXCLUDED.variant_key),
      experiment_id       = COALESCE(cdp.funnel_journeys.experiment_id, EXCLUDED.experiment_id),
      first_step_id       = COALESCE(cdp.funnel_journeys.first_step_id, EXCLUDED.first_step_id),
      furthest_step_index = GREATEST(cdp.funnel_journeys.furthest_step_index, EXCLUDED.furthest_step_index),
      steps               = EXCLUDED.steps || cdp.funnel_journeys.steps,
      started_at          = LEAST(cdp.funnel_journeys.started_at, EXCLUDED.started_at),
      last_at             = GREATEST(cdp.funnel_journeys.last_at, EXCLUDED.last_at),
      converted_at        = LEAST(cdp.funnel_journeys.converted_at, EXCLUDED.converted_at)`,
  )
}

const JOURNEY_COLUMNS: BulkColumn[] = [
  { name: 'workspace_id', cast: 'int' },
  { name: 'funnel_id' },
  { name: 'visitor_key', cast: 'uuid' },
  { name: 'anonymous_id', cast: 'uuid' },
  { name: 'contact_id', cast: 'uuid' },
  { name: 'variant_key' },
  { name: 'experiment_id' },
  { name: 'first_step_id' },
  { name: 'furthest_step_index', cast: 'int' },
  { name: 'steps', cast: 'jsonb' },
  { name: 'utm_source' },
  { name: 'utm_campaign' },
  { name: 'started_at', cast: 'timestamptz' },
  { name: 'last_at', cast: 'timestamptz' },
  { name: 'converted_at', cast: 'timestamptz' },
]

/** anonymous_id -> contact_id for the ids in a batch (FR-TRK-5). */
export async function resolveContacts(
  sql: Sql,
  workspaceId: number,
  anonymousIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(anonymousIds)]
  if (!ids.length) return new Map()
  const rows = await sql<{ anonymous_id: string; contact_id: string }[]>`
    SELECT anonymous_id, contact_id FROM cdp.identity_links
    WHERE workspace_id = ${workspaceId} AND anonymous_id = ANY(${ids}::uuid[])`
  return new Map(rows.map((r) => [r.anonymous_id, r.contact_id]))
}

/**
 * Links an anonymous id to a contact and backfills its history (FR-TRK-5). Idempotent.
 * A different existing link is kept (first identification wins; ADR-0007).
 */
export async function linkIdentity(
  sql: Sql,
  l: { workspaceId: number; anonymousId: string; contactId: string; source: string },
): Promise<{ linked: boolean; contactId: string; backfilled: number }> {
  const [row] = await sql<{ contact_id: string; inserted: boolean }[]>`
    INSERT INTO cdp.identity_links (workspace_id, anonymous_id, contact_id, source)
    VALUES (${l.workspaceId}, ${l.anonymousId}, ${l.contactId}, ${l.source})
    ON CONFLICT (workspace_id, anonymous_id) DO UPDATE SET anonymous_id = EXCLUDED.anonymous_id
    RETURNING contact_id, (xmax = 0) AS inserted`
  const contactId = row!.contact_id
  const backfilled = await backfillContact(sql, l.workspaceId, l.anonymousId, contactId)
  return { linked: row!.inserted, contactId, backfilled }
}

export async function backfillContact(
  sql: Sql,
  workspaceId: number,
  anonymousId: string,
  contactId: string,
): Promise<number> {
  const r = await sql`
    UPDATE cdp.events SET contact_id = ${contactId}
    WHERE workspace_id = ${workspaceId} AND anonymous_id = ${anonymousId} AND contact_id IS NULL`
  await sql`
    UPDATE cdp.sessions SET contact_id = ${contactId}
    WHERE workspace_id = ${workspaceId} AND anonymous_id = ${anonymousId} AND contact_id IS NULL`
  await sql`
    UPDATE cdp.funnel_journeys SET contact_id = ${contactId}
    WHERE workspace_id = ${workspaceId} AND anonymous_id = ${anonymousId} AND contact_id IS NULL`
  return r.count
}

/** Remembers platform identifiers (fbp, fbc, ttp, scid, click ids) per contact (FR-DST-5). */
export async function upsertContactIdentifiers(
  sql: Sql,
  workspaceId: number,
  contactId: string,
  identifiers: { kind: string; value: string }[],
): Promise<void> {
  const rows = identifiers
    .filter((i) => i.value)
    .map((i) => ({
      workspace_id: workspaceId,
      contact_id: contactId,
      kind: i.kind,
      value: i.value.slice(0, 512),
    }))
  if (!rows.length) return
  await bulkInsert(
    sql,
    'cdp.contact_identifiers',
    [
      { name: 'workspace_id', cast: 'int' },
      { name: 'contact_id', cast: 'uuid' },
      { name: 'kind' },
      { name: 'value' },
    ],
    rows,
    'ON CONFLICT (contact_id, kind, value) DO UPDATE SET last_seen = now()',
  )
}

/** Latest value per identifier kind for a contact. */
export async function latestIdentifiers(
  sql: Sql,
  contactId: string,
): Promise<Record<string, string>> {
  const rows = await sql<{ kind: string; value: string }[]>`
    SELECT DISTINCT ON (kind) kind, value FROM cdp.contact_identifiers
    WHERE contact_id = ${contactId} ORDER BY kind, last_seen DESC`
  return Object.fromEntries(rows.map((r) => [r.kind, r.value]))
}

export interface ConsentRecordInsert {
  id: string
  workspaceId: number
  recordedAt: string
  anonymousId: string | null
  contactId: string | null
  sessionId: string | null
  region: string
  regime: 'opt_in' | 'opt_out' | 'notice'
  policyVersion: string | null
  bannerVersion: string | null
  analytics: boolean
  marketing: boolean
  gpc: boolean
  source: string
  ipTrunc: string | null
  userAgent: string | null
}

export async function insertConsentRecords(sql: Sql, rows: ConsentRecordInsert[]): Promise<void> {
  if (!rows.length) return
  const values = rows.map((r) => ({
    id: r.id,
    workspace_id: r.workspaceId,
    recorded_at: r.recordedAt,
    anonymous_id: r.anonymousId,
    contact_id: r.contactId,
    session_id: r.sessionId,
    region: r.region,
    regime: r.regime,
    policy_version: r.policyVersion,
    banner_version: r.bannerVersion,
    analytics: r.analytics,
    marketing: r.marketing,
    gpc: r.gpc,
    source: r.source,
    ip_trunc: r.ipTrunc,
    user_agent: r.userAgent,
  }))
  await bulkInsert(
    sql,
    'cdp.consent_records',
    CONSENT_COLUMNS,
    values,
    'ON CONFLICT (id) DO NOTHING',
  )
}

const CONSENT_COLUMNS: BulkColumn[] = [
  { name: 'id', cast: 'uuid' },
  { name: 'workspace_id', cast: 'int' },
  { name: 'recorded_at', cast: 'timestamptz' },
  { name: 'anonymous_id', cast: 'uuid' },
  { name: 'contact_id', cast: 'uuid' },
  { name: 'session_id', cast: 'uuid' },
  { name: 'region' },
  { name: 'regime' },
  { name: 'policy_version' },
  { name: 'banner_version' },
  { name: 'analytics', cast: 'bool' },
  { name: 'marketing', cast: 'bool' },
  { name: 'gpc', cast: 'bool' },
  { name: 'source' },
  { name: 'ip_trunc', cast: 'inet' },
  { name: 'user_agent' },
]

/** Latest consent per visitor, used by destinations when an event lacks a snapshot. */
export async function latestConsent(
  sql: Sql,
  by: { anonymousId?: string | null; contactId?: string | null },
) {
  if (!by.anonymousId && !by.contactId) return null
  const [r] = await sql<
    {
      analytics: boolean
      marketing: boolean
      regime: string
      region: string
      gpc: boolean
      recorded_at: string
    }[]
  >`
    SELECT analytics, marketing, regime, region, gpc, recorded_at FROM cdp.consent_records
    WHERE (${by.anonymousId ?? null}::uuid IS NOT NULL AND anonymous_id = ${by.anonymousId ?? null}::uuid)
       OR (${by.contactId ?? null}::uuid IS NOT NULL AND contact_id = ${by.contactId ?? null}::uuid)
    ORDER BY recorded_at DESC LIMIT 1`
  return r ?? null
}
