import { destinationDecision, resolveConsent, type Regime } from '@fp/consent'
import type { DestinationSnapshot } from '@fp/contracts'
import { repos, type Sql } from '@fp/db'
import { hasConsent, isConversionEvent, type EnrichedEvent } from '@fp/event-schemas'
import { encryptSecret, type Keyring } from '@fp/platform/crypto'
import { uuidv7 } from '@fp/platform/ids'
import { journeyDeltas, sessionDeltas, type TrackedEvent } from '@fp/tracking'
import type { SnapshotCache } from '../../lib/snapshots.ts'
import type { DeliveryJob, Queues } from '../../lib/queues.ts'
import type { Ingested } from './consumer.ts'

const ADAPTER_LDU: Record<string, boolean> = {
  meta: true,
  tiktok: false,
  snap: false,
  webhook: false,
}

/**
 * Everything derived from newly stored events, inside the insert transaction (ADR-0006/0017):
 * identity resolution, sessions, funnel journeys, consent log, experiments, sequence exits and
 * destination fan-out. Returns the BullMQ enqueue to run after commit.
 */
export function createReadModels(deps: {
  snapshots: SnapshotCache
  queues: Queues
  keyring: Keyring
}) {
  return async function afterInsert(
    tx: Sql,
    items: Ingested[],
  ): Promise<(() => Promise<void>) | void> {
    if (!items.length) return

    // 1. Identity: attach known contacts to anonymous events (FR-TRK-5).
    const needs = items.filter((i) => !i.row.contactId && i.row.anonymousId)
    if (needs.length) {
      const map = await repos.resolveContacts(
        tx,
        1,
        needs.map((i) => i.row.anonymousId!),
      )
      for (const i of needs) {
        const c = map.get(i.row.anonymousId!)
        if (c) {
          i.row.contactId = c
          i.event.contact_id = c
          await tx`UPDATE cdp.events SET contact_id = ${c} WHERE event_id = ${i.row.eventId} AND received_at = ${i.row.receivedAt}`
        }
      }
    }

    // 2. Sessions and funnel journeys (FR-TRK-4).
    const tracked: TrackedEvent[] = items.map(({ row, event }) => ({
      workspaceId: row.workspaceId ?? 1,
      eventId: row.eventId,
      name: row.name,
      occurredAt: row.occurredAt,
      sessionId: row.sessionId,
      anonymousId: row.anonymousId ?? null,
      contactId: row.contactId ?? null,
      funnelId: row.funnelId ?? null,
      stepId: row.stepId ?? null,
      variantKey: row.variantKey ?? null,
      experimentId: event.funnel?.experiment_id ?? null,
      pageUrl: row.pageUrl ?? null,
      pagePath: row.pagePath ?? null,
      referrer: row.referrer ?? null,
      utmSource: row.utmSource ?? null,
      utmMedium: row.utmMedium ?? null,
      utmCampaign: row.utmCampaign ?? null,
      utmTerm: row.utmTerm ?? null,
      utmContent: row.utmContent ?? null,
      clickIds: row.clickIds ?? null,
      deviceType: row.deviceType ?? null,
      os: row.os ?? null,
      browser: row.browser ?? null,
      geoCountry: row.geoCountry ?? null,
      isBot: row.isBot ?? false,
    }))
    // Sessions come from browser events; server events (form submits, segment changes) only
    // mark an existing session converted and attach the contact.
    await repos.upsertSessions(
      tx,
      sessionDeltas(tracked.filter((_, i) => items[i]!.row.source === 'browser')),
    )
    for (const [i, t] of tracked.entries()) {
      if (items[i]!.row.source !== 'server' || !isConversionEvent(t.name)) continue
      await tx`UPDATE cdp.sessions SET converted = true, contact_id = coalesce(contact_id, ${t.contactId})
        WHERE session_id = ${t.sessionId}`
    }
    const funnels = new Map((await deps.snapshots.list('funnel')).map((f) => [f.id, f]))
    await repos.upsertJourneys(
      tx,
      journeyDeltas(
        tracked,
        (funnelId, stepId) => funnels.get(funnelId)?.steps.findIndex((s) => s.id === stepId) ?? 0,
      ),
    )

    // 3. Consent log (FR-CNS-2) from banner choices.
    const consents = items.filter((i) => i.row.name === 'consent_updated')
    if (consents.length)
      await repos.insertConsentRecords(
        tx,
        consents.map(({ row, event }) => ({
          id: row.eventId,
          workspaceId: 1,
          recordedAt: row.occurredAt,
          anonymousId: row.anonymousId ?? null,
          contactId: row.contactId ?? null,
          sessionId: row.sessionId,
          region: event.region ?? 'XX',
          regime: event.regime ?? 'opt_in',
          policyVersion: String(row.properties?.policy_version ?? '') || null,
          bannerVersion: String(row.properties?.banner_version ?? '') || null,
          analytics: row.properties?.analytics === true,
          marketing: row.properties?.marketing === true,
          gpc: event.gpc ?? row.properties?.gpc === true,
          source: 'banner',
          ipTrunc: row.ipTrunc ?? null,
          userAgent: event.user_agent?.slice(0, 512) ?? null,
        })),
      )

    // 4. Experiments (FR-FUN-5): exposure and goal conversion per visitor.
    for (const { row, event } of items) {
      const visitor = row.anonymousId ?? row.sessionId
      if (row.name === 'experiment_exposed' && typeof row.properties?.experiment_id === 'string') {
        await tx`
          INSERT INTO cdp.experiment_assignments (experiment_id, visitor_key, variant_key, assigned_at, exposed_at)
          VALUES (${row.properties.experiment_id}, ${visitor}, ${String(row.properties.variant_key ?? '')}, ${row.occurredAt}, ${row.occurredAt})
          ON CONFLICT (workspace_id, experiment_id, visitor_key) DO UPDATE
            SET exposed_at = coalesce(cdp.experiment_assignments.exposed_at, EXCLUDED.exposed_at)`
      }
      const expId = event.funnel?.experiment_id
      if (expId) {
        const exp = await deps.snapshots.get('experiment', expId)
        if (exp && exp.goalEvent === row.name)
          await tx`
            UPDATE cdp.experiment_assignments SET converted_at = coalesce(converted_at, ${row.occurredAt})
            WHERE experiment_id = ${expId} AND visitor_key = ANY(${[visitor, row.sessionId]}::uuid[])`
      }
    }

    // 5. Sequence exit on events (FR-EML-2).
    const sequences = await deps.snapshots.list('email_sequence')
    for (const { row } of items) {
      if (!row.contactId) continue
      const ids = sequences.filter((s) => s.exit.eventNames.includes(row.name)).map((s) => s.id)
      if (ids.length) await repos.exitEnrollments(tx, row.contactId, 'exit_event', ids)
    }

    // 6. Destination fan-out (FR-DST-*): delivery rows now, jobs after commit.
    const destinations = (await deps.snapshots.list('destination')).filter((d) => d.enabled)
    const jobs: DeliveryJob[] = []
    if (destinations.length) {
      const rows: repos.NewDelivery[] = []
      for (const { row, event } of items) {
        for (const d of destinations) {
          const mapping = d.eventMap.find((m) => m.enabled && m.source === row.name)
          if (!mapping) continue
          const status = deliveryStatus(d, event)
          const deliveryId = uuidv7()
          rows.push({
            deliveryId,
            workspaceId: 1,
            createdAt: row.receivedAt,
            destinationId: d.id,
            destinationType: d.type,
            eventId: row.eventId,
            eventName: row.name,
            platformEvent: mapping.target,
            contactId: row.contactId ?? null,
            status,
            testMode: d.testMode,
          })
          if (status === 'pending')
            jobs.push({
              deliveryId,
              createdAt: row.receivedAt,
              destinationId: d.id,
              eventId: row.eventId,
              ipEnc: event.ip ? encryptSecret(event.ip, deps.keyring) : undefined,
              userAgent: event.user_agent,
              cookies: event.cookies,
              traceparent: event.traceparent,
            })
        }
      }
      const created = new Set((await repos.createDeliveries(tx, rows)).map((r) => r.deliveryId))
      for (let i = jobs.length - 1; i >= 0; i--)
        if (!created.has(jobs[i]!.deliveryId)) jobs.splice(i, 1)
    }
    if (jobs.length) return () => deps.queues.enqueueDeliveries(jobs)
  }
}

/** Consent and config gating at fan-out time (FR-DST-6); recorded as skipped_* for auditability. */
export function deliveryStatus(
  d: DestinationSnapshot,
  e: EnrichedEvent,
): repos.NewDelivery['status'] {
  if (e.is_bot && !d.includeBots) return 'skipped_filter'
  if (d.type === 'webhook' ? !d.endpointUrl : !d.pixelId) return 'skipped_config'
  if (!d.credentials) return 'skipped_config'
  if (d.type === 'webhook') return 'pending' // the lead hand-off to the brand's own tools
  const regime: Regime = e.regime ?? 'opt_in'
  const consent = resolveConsent({
    regime,
    choice: {
      analytics: hasConsent(e.consent_mask, 'analytics'),
      marketing: hasConsent(e.consent_mask, 'marketing'),
    },
    gpc: e.gpc,
  })
  // An opt-out region visitor who opted out (mask without marketing) may still go to LDU platforms.
  const decision = destinationDecision(
    { ...consent, optedOut: regime !== 'opt_in' && !consent.marketing },
    {
      supportsLimitedDataUse: ADAPTER_LDU[d.type] ?? false,
      limitedDataUseEnabled: d.limitedDataUse,
    },
  )
  return decision.send ? 'pending' : 'skipped_consent'
}
