import {
  boolean,
  integer,
  jsonb,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
  date,
} from 'drizzle-orm/pg-core'
import { cdp } from './events.ts'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' })

export const DELIVERY_STATUSES = [
  'pending',
  'success',
  'retrying',
  'failed',
  'dead',
  'skipped_consent',
  'skipped_config',
  'skipped_filter',
] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

/** Mirrors migrations/0003 (partitioned daily on created_at). */
export const destinationDeliveries = cdp.table(
  'destination_deliveries',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    deliveryId: uuid('delivery_id').notNull(),
    createdAt: ts('created_at').notNull(),
    destinationId: text('destination_id').notNull(),
    destinationType: text('destination_type').notNull(),
    eventId: uuid('event_id').notNull(),
    eventName: text('event_name').notNull(),
    platformEvent: text('platform_event'),
    contactId: uuid('contact_id'),
    status: text('status', { enum: DELIVERY_STATUSES }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    testMode: boolean('test_mode').notNull().default(false),
    lastStatusCode: integer('last_status_code'),
    lastError: text('last_error'),
    latencyMs: integer('latency_ms'),
    requestSummary: jsonb('request_summary').$type<Record<string, unknown>>(),
    responseBody: text('response_body'),
    updatedAt: ts('updated_at').notNull(),
    completedAt: ts('completed_at'),
  },
  (t) => [
    primaryKey({ columns: [t.deliveryId, t.createdAt] }),
    unique().on(t.destinationId, t.eventId, t.createdAt),
  ],
)

export const emailSuppressions = cdp.table(
  'email_suppressions',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    emailHash: text('email_hash').notNull(),
    reason: text('reason', {
      enum: ['unsubscribe', 'bounce', 'complaint', 'manual', 'erasure'],
    }).notNull(),
    detail: text('detail'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.emailHash] })],
)

export const EMAIL_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'complained',
  'failed',
  'suppressed',
] as const

export const emailMessages = cdp.table(
  'email_messages',
  {
    id: uuid('id').primaryKey(),
    workspaceId: integer('workspace_id').notNull().default(1),
    contactId: uuid('contact_id').notNull(),
    kind: text('kind', {
      enum: ['transactional', 'double_opt_in', 'sequence', 'broadcast'],
    }).notNull(),
    templateId: text('template_id'),
    sequenceId: text('sequence_id'),
    enrollmentId: uuid('enrollment_id'),
    stepIndex: integer('step_index'),
    toHash: text('to_hash').notNull(),
    subject: text('subject'),
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    status: text('status', { enum: EMAIL_STATUSES }).notNull(),
    error: text('error'),
    createdAt: ts('created_at').notNull().defaultNow(),
    sentAt: ts('sent_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.enrollmentId, t.stepIndex)],
)

export const emailEnrollments = cdp.table('email_enrollments', {
  id: uuid('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().default(1),
  contactId: uuid('contact_id').notNull(),
  sequenceId: text('sequence_id').notNull(),
  status: text('status', { enum: ['active', 'completed', 'exited', 'paused'] }).notNull(),
  currentStep: integer('current_step').notNull().default(0),
  nextRunAt: ts('next_run_at'),
  enrolledAt: ts('enrolled_at').notNull().defaultNow(),
  finishedAt: ts('finished_at'),
  exitReason: text('exit_reason'),
  trigger: jsonb('trigger').$type<Record<string, unknown>>(),
})

/** Mirrors migrations/0004. */
export const experimentAssignments = cdp.table(
  'experiment_assignments',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    experimentId: text('experiment_id').notNull(),
    visitorKey: uuid('visitor_key').notNull(),
    variantKey: text('variant_key').notNull(),
    assignedAt: ts('assigned_at').notNull().defaultNow(),
    exposedAt: ts('exposed_at'),
    convertedAt: ts('converted_at'),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.experimentId, t.visitorKey] })],
)

export const auditLogs = cdp.table('audit_logs', {
  id: uuid('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().default(1),
  at: ts('at').notNull().defaultNow(),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  changes: jsonb('changes').$type<Record<string, unknown>>(),
  traceId: text('trace_id'),
})

export const erasureTombstones = cdp.table('erasure_tombstones', {
  id: uuid('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().default(1),
  contactId: uuid('contact_id').notNull(),
  emailHash: text('email_hash'),
  phoneHash: text('phone_hash'),
  requestId: text('request_id'),
  erasedAt: ts('erased_at').notNull().defaultNow(),
})

export const segmentMemberships = cdp.table(
  'segment_memberships',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    segmentId: text('segment_id').notNull(),
    contactId: uuid('contact_id').notNull(),
    enteredAt: ts('entered_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.segmentId, t.contactId] })],
)

export const duplicateCandidates = cdp.table(
  'duplicate_candidates',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    contactA: uuid('contact_a').notNull(),
    contactB: uuid('contact_b').notNull(),
    reason: text('reason').notNull(),
    score: real('score').notNull(),
    status: text('status', { enum: ['open', 'merged', 'dismissed'] })
      .notNull()
      .default('open'),
    createdAt: ts('created_at').notNull().defaultNow(),
    resolvedAt: ts('resolved_at'),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.contactA, t.contactB] })],
)

export const aggEventsDaily = cdp.table(
  'agg_events_daily',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    day: date('day', { mode: 'string' }).notNull(),
    name: text('name').notNull(),
    funnelId: text('funnel_id').notNull().default(''),
    stepId: text('step_id').notNull().default(''),
    variantKey: text('variant_key').notNull().default(''),
    utmSource: text('utm_source').notNull().default(''),
    utmMedium: text('utm_medium').notNull().default(''),
    utmCampaign: text('utm_campaign').notNull().default(''),
    events: integer('events').notNull(),
    visitors: integer('visitors').notNull(),
  },
  (t) => [
    primaryKey({
      columns: [
        t.workspaceId,
        t.day,
        t.name,
        t.funnelId,
        t.stepId,
        t.variantKey,
        t.utmSource,
        t.utmMedium,
        t.utmCampaign,
      ],
    }),
  ],
)

export const aggDeliveryHourly = cdp.table(
  'agg_delivery_hourly',
  {
    workspaceId: integer('workspace_id').notNull().default(1),
    hour: ts('hour').notNull(),
    destinationId: text('destination_id').notNull(),
    status: text('status').notNull(),
    deliveries: integer('deliveries').notNull(),
    p95LatencyMs: integer('p95_latency_ms'),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.hour, t.destinationId, t.status] })],
)

export type DeliveryRow = typeof destinationDeliveries.$inferInsert
