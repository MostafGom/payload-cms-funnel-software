import { z } from 'zod'

/** A touch point the SDK remembers (first and last) for attribution without cookies (FR-FRM-8). */
export const Touch = z.object({
  url: z.string().max(2048),
  referrer: z.string().max(2048).optional(),
  at: z.iso.datetime({ offset: true }),
})
export type Touch = z.infer<typeof Touch>

/**
 * Public form submission request (`POST /api/v1/forms/:id/submissions`, ADR-0021).
 * `values` are validated against the published form version; `meta` carries tracking context.
 */
export const SubmissionRequest = z.object({
  values: z.record(
    z.string().max(64),
    z.union([z.string().max(5000), z.boolean(), z.array(z.string().max(256)).max(50)]),
  ),
  meta: z.object({
    /** browser-generated UUIDv7 shared by the pixel and the server event (FR-DST-4) */
    eventId: z.uuid(),
    sessionId: z.uuid(),
    anonymousId: z.uuid().optional(),
    /** ms epoch when the form rendered (min-time spam check) */
    startedAt: z.number().int().positive(),
    /** honeypot; must be empty */
    hp: z.string().max(256).optional(),
    turnstileToken: z.string().max(4096).optional(),
    pageUrl: z.url().max(2048),
    referrer: z.string().max(2048).optional(),
    firstTouch: Touch.optional(),
    lastTouch: Touch.optional(),
    funnel: z
      .object({
        funnelId: z.string().max(64),
        stepId: z.string().max(64).optional(),
        variantKey: z.string().max(64).optional(),
        experimentId: z.string().max(64).optional(),
      })
      .optional(),
    consent: z.object({ a: z.boolean(), m: z.boolean(), d: z.boolean().optional() }).optional(),
    locale: z.string().max(35).optional(),
    tz: z.string().max(64).optional(),
  }),
})
export type SubmissionRequest = z.infer<typeof SubmissionRequest>

export const SubmissionResponse = z.object({
  ok: z.literal(true),
  submissionId: z.string(),
  eventId: z.uuid(),
  next: z.discriminatedUnion('type', [
    z.object({ type: z.literal('redirect'), url: z.string() }),
    z.object({ type: z.literal('message'), message: z.string() }),
  ]),
})
export type SubmissionResponse = z.infer<typeof SubmissionResponse>
