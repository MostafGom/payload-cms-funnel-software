import {
  ContactErasedPayload,
  ContactMergedPayload,
  DestinationReplayPayload,
  EmailSendPayload,
  IdentityLinkedPayload,
  OutboxTopics,
  SequenceTriggerPayload,
  ContactChangedPayload,
} from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { INGEST_STREAM_MAXLEN, STREAM_FIELD, STREAMS, type EnrichedEvent } from '@fp/event-schemas'
import { decryptSecret, type Keyring } from '@fp/platform/crypto'
import type { Logger } from '@fp/platform/logger'
import { publishDeduped, type Redis } from '@fp/platform/redis'
import type { Queues } from '../../lib/queues.ts'
import type { SnapshotCache } from '../../lib/snapshots.ts'
import { enrollForTrigger } from '../email/enroll.ts'
import { evaluateContact } from '../segments/compute.ts'
import { purgeErasedContact, repointMergedContact } from './privacy.ts'

export interface RelayDeps {
  sql: Sql
  redis: Redis
  queues: Queues
  snapshots: SnapshotCache
  keyring: Keyring
  logger: Logger
  stream?: string
}

/**
 * Outbox relay (ADR-0006): turns committed business facts into stream entries and jobs.
 * Each handler is idempotent because a message can be relayed more than once (at-least-once).
 */
export function createRelay(deps: RelayDeps) {
  const stream = deps.stream ?? STREAMS.ingest

  const handlers: Record<string, (payload: unknown) => Promise<void>> = {
    [OutboxTopics.serverEvent]: async (p) => {
      const e = { ...(p as EnrichedEvent) }
      if (e.ip_enc) {
        try {
          e.ip = decryptSecret(e.ip_enc, deps.keyring)
        } catch {
          e.ip = null
        }
        delete e.ip_enc
      }
      await publishDeduped(
        deps.redis,
        { stream, field: STREAM_FIELD, maxLen: INGEST_STREAM_MAXLEN },
        [e],
      )
    },
    [OutboxTopics.identityLinked]: async (p) => {
      const l = IdentityLinkedPayload.parse(p)
      await repos.backfillContact(deps.sql, 1, l.anonymousId, l.contactId)
    },
    [OutboxTopics.emailSend]: async (p) => {
      const m = EmailSendPayload.parse(p)
      await deps.queues.enqueueEmail({
        kind: m.kind,
        contactId: m.contactId,
        templateId: m.templateId,
        vars: m.vars,
        messageId: current!.id,
      })
    },
    [OutboxTopics.sequenceTrigger]: async (p) => {
      const t = SequenceTriggerPayload.parse(p)
      await enrollForTrigger(deps, t.contactId, t.trigger)
    },
    [OutboxTopics.contactChanged]: async (p) => {
      const { contactId } = ContactChangedPayload.parse(p)
      await evaluateContact(deps, contactId)
      const contact = await repos.getContact(deps.sql, contactId)
      if (!contact) return
      if (contact.marketing_status === 'unsubscribed' || contact.status !== 'active')
        await repos.exitEnrollments(deps.sql, contactId, 'not_subscribed')
      const exitBy = (await deps.snapshots.list('email_sequence'))
        .filter((s) => s.exit.tagIds.some((t) => contact.tag_ids.includes(t)))
        .map((s) => s.id)
      if (exitBy.length) await repos.exitEnrollments(deps.sql, contactId, 'exit_tag', exitBy)
    },
    [OutboxTopics.contactErased]: async (p) =>
      purgeErasedContact(deps.sql, ContactErasedPayload.parse(p)),
    [OutboxTopics.contactMerged]: async (p) =>
      repointMergedContact(deps.sql, ContactMergedPayload.parse(p)),
    [OutboxTopics.destinationReplay]: async (p) => {
      const { deliveries } = DestinationReplayPayload.parse(p)
      for (let i = 0; i < deliveries.length; i += 500) {
        const chunk = deliveries.slice(i, i + 500)
        const rows = await deps.sql<
          { delivery_id: string; created_at: string; destination_id: string; event_id: string }[]
        >`
          UPDATE cdp.destination_deliveries SET status = 'pending', updated_at = now(), completed_at = NULL, last_error = 'replay'
          WHERE (delivery_id, created_at) IN (SELECT * FROM unnest(${chunk.map((d) => d.deliveryId)}::uuid[], ${chunk.map((d) => d.createdAt)}::timestamptz[]))
          RETURNING delivery_id, created_at, destination_id, event_id`
        // Replays carry no client IP (never stored); platforms accept that.
        const q = rows.map((r) => ({
          deliveryId: r.delivery_id,
          createdAt: new Date(r.created_at).toISOString(),
          destinationId: r.destination_id,
          eventId: r.event_id,
        }))
        for (const j of q)
          await deps.queues
            .delivery(j.destinationId)
            .remove(j.deliveryId)
            .catch(() => 0)
        await deps.queues.enqueueDeliveries(q)
      }
    },
  }

  let current: { id: string } | undefined

  async function relayOnce(limit = 200): Promise<{ published: number; failed: number }> {
    return repos.relayOutbox(deps.sql, limit, async (msgs) => {
      const failures = new Map<string, string>()
      for (const m of msgs) {
        const h = handlers[m.topic]
        if (!h) {
          failures.set(m.id, `no handler for topic ${m.topic}`)
          continue
        }
        current = m
        try {
          await h(m.payload)
        } catch (err) {
          deps.logger.warn({ err, topic: m.topic, id: m.id }, 'outbox handler failed')
          failures.set(m.id, String(err))
        }
      }
      current = undefined
      return failures
    })
  }

  async function run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        const r = await relayOnce()
        if (!r.published && !r.failed) await new Promise((res) => setTimeout(res, 250))
      } catch (err) {
        deps.logger.error({ err }, 'relay loop error')
        await new Promise((res) => setTimeout(res, 1000))
      }
    }
  }

  return { relayOnce, run, handlers }
}
