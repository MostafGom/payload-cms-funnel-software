import { z } from 'zod'

/**
 * Published CMS configuration consumed by workers via cdp.config_snapshots (ADR-0025).
 * The CMS validates with these schemas before writing; workers validate again when reading.
 */
export const SNAPSHOT_KINDS = [
  'form',
  'funnel',
  'destination',
  'email_template',
  'email_sequence',
  'email_settings',
  'consent_settings',
  'segment',
  'experiment',
] as const
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number]

export const DESTINATION_TYPES = ['meta', 'tiktok', 'snap', 'webhook'] as const
export type DestinationType = (typeof DESTINATION_TYPES)[number]

export const DestinationSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(DESTINATION_TYPES),
  enabled: z.boolean(),
  testMode: z.boolean().default(false),
  testEventCode: z.string().max(64).optional(),
  /** pixel / dataset id (Meta), pixel code (TikTok), pixel id (Snap) */
  pixelId: z.string().max(128).optional(),
  browserPixel: z.boolean().default(true),
  /** AES-GCM ciphertext (platform/crypto secretbox) of the adapter credentials JSON */
  credentials: z.string().optional(),
  endpointUrl: z.url().optional(),
  /** our canonical event name -> platform event name */
  eventMap: z
    .array(z.object({ source: z.string(), target: z.string(), enabled: z.boolean().default(true) }))
    .default([]),
  rateLimitPerSecond: z.number().int().min(1).max(10_000).default(50),
  /** Meta Limited Data Use for opted-out US-state visitors (FR-DST-6) */
  limitedDataUse: z.boolean().default(true),
  /** forward events from bots (default false) */
  includeBots: z.boolean().default(false),
})
export type DestinationSnapshot = z.infer<typeof DestinationSnapshot>

export const FunnelSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['landing', 'form', 'thank_you', 'custom']),
      pageId: z.string().optional(),
    }),
  ),
})
export type FunnelSnapshot = z.infer<typeof FunnelSnapshot>

export const EmailTemplateSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  preheader: z.string().optional(),
  html: z.string(),
  text: z.string(),
})
export type EmailTemplateSnapshot = z.infer<typeof EmailTemplateSnapshot>

export const SendWindow = z.object({
  /** ISO weekdays 1 (Mon) .. 7 (Sun) */
  days: z.array(z.number().int().min(1).max(7)).min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  timezone: z.string().default('UTC'),
})
export type SendWindow = z.infer<typeof SendWindow>

export const SequenceTrigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('form_submitted'), formId: z.string() }),
  z.object({ type: z.literal('tag_added'), tagId: z.string() }),
  z.object({ type: z.literal('list_joined'), listId: z.string() }),
  z.object({ type: z.literal('segment_entered'), segmentId: z.string() }),
  z.object({ type: z.literal('manual') }),
])
export type SequenceTrigger = z.infer<typeof SequenceTrigger>

export const EmailSequenceSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  trigger: SequenceTrigger,
  steps: z
    .array(
      z.object({
        delayAmount: z.number().int().min(0),
        delayUnit: z.enum(['minutes', 'hours', 'days']),
        templateId: z.string(),
      }),
    )
    .min(1),
  window: SendWindow.optional(),
  exit: z.object({
    tagIds: z.array(z.string()).default([]),
    eventNames: z.array(z.string()).default([]),
    segmentId: z.string().optional(),
  }),
})
export type EmailSequenceSnapshot = z.infer<typeof EmailSequenceSnapshot>

export const EmailSettingsSnapshot = z.object({
  provider: z.enum(['smtp', 'postmark', 'resend', 'ses']),
  fromName: z.string(),
  fromEmail: z.email(),
  replyTo: z.email().optional(),
  /** CAN-SPAM requires a postal address in marketing email */
  postalAddress: z.string().default(''),
  credentials: z.string().optional(),
  messageStream: z.string().optional(),
})
export type EmailSettingsSnapshot = z.infer<typeof EmailSettingsSnapshot>

export const ConsentSettingsSnapshot = z.object({
  policyVersion: z.string(),
  bannerVersion: z.string(),
  /** region code (ISO country, or US-<state>) -> regime override */
  overrides: z
    .array(z.object({ region: z.string(), regime: z.enum(['opt_in', 'opt_out', 'notice']) }))
    .default([]),
  defaultRegime: z.enum(['opt_in', 'opt_out', 'notice']).default('notice'),
})
export type ConsentSettingsSnapshot = z.infer<typeof ConsentSettingsSnapshot>

export const ExperimentSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'running', 'stopped', 'completed']),
  funnelId: z.string().optional(),
  stepId: z.string().optional(),
  goalEvent: z.string().default('form_submitted'),
  variants: z
    .array(
      z.object({
        key: z.string(),
        weight: z.number().min(0),
        pageId: z.string(),
        /** resolved at publish time so the proxy can route without the CMS */
        host: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .min(2),
})
export type ExperimentSnapshot = z.infer<typeof ExperimentSnapshot>
