import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  inet,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { cdp } from './events.ts'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })
const jsonDefault = sql`'{}'::jsonb`

/** Mirrors migrations/0002_tracking_identity.sql. */
export const sessions = cdp.table('sessions', {
  workspaceId: integer('workspace_id').notNull().default(1),
  sessionId: uuid('session_id').primaryKey(),
  anonymousId: uuid('anonymous_id'),
  contactId: uuid('contact_id'),
  startedAt: ts('started_at').notNull(),
  lastSeenAt: ts('last_seen_at').notNull(),
  eventCount: integer('event_count').notNull().default(0),
  pageviews: integer('pageviews').notNull().default(0),
  landingUrl: text('landing_url'),
  landingPath: text('landing_path'),
  referrer: text('referrer'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
  clickIds: jsonb('click_ids').$type<Record<string, string>>(),
  deviceType: text('device_type'),
  os: text('os'),
  browser: text('browser'),
  geoCountry: char('geo_country', { length: 2 }),
  isBot: boolean('is_bot').notNull().default(false),
  converted: boolean('converted').notNull().default(false),
})

export const funnelJourneys = cdp.table(
  'funnel_journeys',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    funnelId: text('funnel_id').notNull(),
    visitorKey: uuid('visitor_key').notNull(),
    anonymousId: uuid('anonymous_id'),
    contactId: uuid('contact_id'),
    variantKey: text('variant_key'),
    experimentId: text('experiment_id'),
    firstStepId: text('first_step_id'),
    furthestStepIndex: integer('furthest_step_index').notNull().default(0),
    /** step_id -> ISO timestamp first reached */
    steps: jsonb('steps').$type<Record<string, string>>().notNull().default(jsonDefault),
    utmSource: text('utm_source'),
    utmCampaign: text('utm_campaign'),
    startedAt: ts('started_at').notNull(),
    lastAt: ts('last_at').notNull(),
    convertedAt: ts('converted_at'),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.funnelId, t.visitorKey] })],
)

export const identityLinks = cdp.table(
  'identity_links',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    anonymousId: uuid('anonymous_id').notNull(),
    contactId: uuid('contact_id').notNull(),
    source: text('source').notNull(),
    linkedAt: ts('linked_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.anonymousId] })],
)

export const contactIdentifiers = cdp.table(
  'contact_identifiers',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    contactId: uuid('contact_id').notNull(),
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    firstSeen: ts('first_seen').notNull().defaultNow(),
    lastSeen: ts('last_seen').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.kind, t.value] })],
)

export const consentRecords = cdp.table('consent_records', {
  id: uuid('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().default(1),
  recordedAt: ts('recorded_at').notNull(),
  anonymousId: uuid('anonymous_id'),
  contactId: uuid('contact_id'),
  sessionId: uuid('session_id'),
  region: text('region').notNull(),
  regime: text('regime', { enum: ['opt_in', 'opt_out', 'notice'] }).notNull(),
  policyVersion: text('policy_version'),
  bannerVersion: text('banner_version'),
  analytics: boolean('analytics').notNull(),
  marketing: boolean('marketing').notNull(),
  gpc: boolean('gpc').notNull().default(false),
  source: text('source').notNull(),
  ipTrunc: inet('ip_trunc'),
  userAgent: text('user_agent'),
})

export const outbox = cdp.table('outbox', {
  id: uuid('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().default(1),
  topic: text('topic').notNull(),
  key: text('key'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  traceparent: text('traceparent'),
  createdAt: ts('created_at').notNull().defaultNow(),
  availableAt: ts('available_at').notNull().defaultNow(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  publishedAt: ts('published_at'),
})

export const configSnapshots = cdp.table(
  'config_snapshots',
  {
    kind: text('kind').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    version: integer('version').notNull().default(1),
    deleted: boolean('deleted').notNull().default(false),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
)

export type SessionRow = typeof sessions.$inferInsert
export type FunnelJourneyRow = typeof funnelJourneys.$inferInsert
export type ConsentRecordRow = typeof consentRecords.$inferInsert
export type OutboxRow = typeof outbox.$inferSelect
