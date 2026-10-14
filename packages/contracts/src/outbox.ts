import { z } from 'zod'

/**
 * Outbox topics (ADR-0006). The writer validates the payload; the relay validates again and
 * routes. Adding a topic: add it here, then a route in the worker relay.
 */
export const OutboxTopics = {
  /** a server-side event for the ingest stream (EnrichedEvent JSON) */
  serverEvent: 'event.server',
  /** anonymous id resolved to a contact; backfill history */
  identityLinked: 'identity.linked',
  /** send one email (DOI confirmation, transactional) */
  emailSend: 'email.send',
  /** something that may enroll a contact into sequences */
  sequenceTrigger: 'sequence.trigger',
  /** contact changed in a way that may move segment membership */
  contactChanged: 'contact.changed',
  /** DSAR erasure completed in the CMS; purge cdp data */
  contactErased: 'contact.erased',
  /** duplicate merged in the CMS; re-point cdp rows from `fromId` to `toId` */
  contactMerged: 'contact.merged',
  /** re-send deliveries (manual or bulk replay, FR-DST-7) */
  destinationReplay: 'destination.replay',
} as const
export type OutboxTopic = (typeof OutboxTopics)[keyof typeof OutboxTopics]

export const IdentityLinkedPayload = z.object({
  anonymousId: z.uuid(),
  contactId: z.uuid(),
  source: z.string(),
})

export const EmailSendPayload = z.object({
  kind: z.enum(['transactional', 'double_opt_in']),
  contactId: z.uuid(),
  templateId: z.string().optional(),
  /** variables available to the template, never secrets */
  vars: z.record(z.string(), z.string()).default({}),
})

export const SequenceTriggerPayload = z.object({
  contactId: z.uuid(),
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('form_submitted'), formId: z.string() }),
    z.object({ type: z.literal('tag_added'), tagId: z.string() }),
    z.object({ type: z.literal('list_joined'), listId: z.string() }),
    z.object({ type: z.literal('segment_entered'), segmentId: z.string() }),
    z.object({ type: z.literal('manual'), sequenceId: z.string() }),
  ]),
})

export const ContactChangedPayload = z.object({ contactId: z.uuid() })

export const ContactErasedPayload = z.object({
  contactId: z.uuid(),
  emailHash: z.string().optional(),
  phoneHash: z.string().optional(),
  anonymousIds: z.array(z.uuid()).default([]),
  requestId: z.string().optional(),
})

export const ContactMergedPayload = z.object({ fromId: z.uuid(), toId: z.uuid() })

export const DestinationReplayPayload = z.object({
  deliveries: z.array(z.object({ deliveryId: z.uuid(), createdAt: z.string() })).max(10_000),
})

export const OUTBOX_SCHEMAS = {
  [OutboxTopics.contactMerged]: ContactMergedPayload,
  [OutboxTopics.destinationReplay]: DestinationReplayPayload,
  [OutboxTopics.identityLinked]: IdentityLinkedPayload,
  [OutboxTopics.emailSend]: EmailSendPayload,
  [OutboxTopics.sequenceTrigger]: SequenceTriggerPayload,
  [OutboxTopics.contactChanged]: ContactChangedPayload,
  [OutboxTopics.contactErased]: ContactErasedPayload,
} as const
