import { z } from 'zod'

/**
 * Wire format sent by the tracker SDK and server-side producers (ADR-0008).
 * Breaking changes to this envelope require a new batch version `v`.
 */

const uuid = z.uuid()
export const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/
export const MAX_PROPERTIES_BYTES = 4096
export const MAX_BATCH_SIZE = 50

export const PageContext = z.object({
  url: z.url().max(2048),
  path: z.string().max(1024),
  referrer: z.string().max(2048).optional(),
  title: z.string().max(512).optional(),
})

export const ClientConsent = z.object({
  /** analytics purpose granted */
  a: z.boolean(),
  /** marketing purpose granted */
  m: z.boolean(),
  /** consent policy version the visitor answered */
  v: z.string().max(32).optional(),
  /** the visitor made an explicit choice (otherwise a/m are regime defaults) */
  d: z.boolean().optional(),
})

export const ClientContext = z.object({
  locale: z.string().max(35).optional(),
  tz: z.string().max(64).optional(),
  screen: z
    .object({ w: z.number().int().nonnegative(), h: z.number().int().nonnegative() })
    .optional(),
  consent: ClientConsent.optional(),
})

export const FunnelContext = z.object({
  funnel_id: z.string().max(64),
  step_id: z.string().max(64).optional(),
  variant_key: z.string().max(64).optional(),
  experiment_id: z.string().max(64).optional(),
})

const Properties = z
  .record(z.string().max(128), z.unknown())
  .refine((p) => Buffer.byteLength(JSON.stringify(p), 'utf8') <= MAX_PROPERTIES_BYTES, {
    message: `properties must be <= ${MAX_PROPERTIES_BYTES} bytes`,
  })

export const EventEnvelope = z.object({
  event_id: uuid,
  name: z.string().regex(EVENT_NAME_PATTERN),
  schema_v: z.number().int().min(1).default(1),
  occurred_at: z.iso.datetime({ offset: true }),
  session_id: uuid,
  anonymous_id: uuid.optional(),
  sdk_v: z.string().max(32),
  page: PageContext,
  context: ClientContext.default({}),
  funnel: FunnelContext.optional(),
  properties: Properties.default({}),
})
export type EventEnvelope = z.infer<typeof EventEnvelope>

export const EventBatch = z.object({
  v: z.literal(1),
  /** public site key; maps to a workspace (ADR-0013) */
  sk: z.string().min(1).max(64),
  sent_at: z.iso.datetime({ offset: true }),
  batch: z.array(z.unknown()).min(1).max(MAX_BATCH_SIZE),
})
export type EventBatch = z.infer<typeof EventBatch>
