import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  index,
  inet,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const cdp = pgSchema('cdp')

/**
 * Typed mirror of migrations/0001_events.sql (partitioned; DDL is hand-written SQL).
 * `schema-drift.int.test.ts` fails CI if this definition and the database diverge.
 */
export const events = cdp.table(
  'events',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    eventId: uuid('event_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'string' }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'string' }).notNull(),
    name: text('name').notNull(),
    schemaV: smallint('schema_v').notNull(),
    source: text('source', { enum: ['browser', 'server'] }).notNull(),
    anonymousId: uuid('anonymous_id'),
    contactId: uuid('contact_id'),
    sessionId: uuid('session_id').notNull(),
    funnelId: text('funnel_id'),
    stepId: text('step_id'),
    variantKey: text('variant_key'),
    pageUrl: text('page_url'),
    pagePath: text('page_path'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    clickIds: jsonb('click_ids').$type<Record<string, string>>(),
    properties: jsonb('properties')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    context: jsonb('context').$type<Record<string, unknown>>(),
    deviceType: text('device_type'),
    os: text('os'),
    browser: text('browser'),
    geoCountry: char('geo_country', { length: 2 }),
    geoRegion: text('geo_region'),
    geoCity: text('geo_city'),
    ipTrunc: inet('ip_trunc'),
    consent: smallint('consent').notNull(),
    isBot: boolean('is_bot').notNull().default(false),
    sdkV: text('sdk_v'),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.receivedAt] }),
    index('events_ws_anon_idx').on(t.workspaceId, t.anonymousId, t.receivedAt),
  ],
)

export type EventRow = typeof events.$inferInsert
