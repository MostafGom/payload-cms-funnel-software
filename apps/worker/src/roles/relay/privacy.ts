import type { ContactErasedPayload, ContactMergedPayload } from '@fp/contracts'
import type { Sql } from '@fp/db'
import { uuidv7 } from '@fp/platform/ids'
import type { z } from 'zod'

/**
 * Erasure in `cdp` after the CMS rows were deleted (FR-CNS-4): events and read models of the
 * person are deleted; consent proof is pseudonymised (kept, ids nulled); a hashes-only tombstone
 * and an `erasure` suppression stop re-imports and email. Idempotent.
 */
export async function purgeErasedContact(
  sql: Sql,
  p: z.infer<typeof ContactErasedPayload>,
): Promise<void> {
  const anon = p.anonymousIds
  await sql.begin(async (tx) => {
    await tx`DELETE FROM cdp.events WHERE contact_id = ${p.contactId} OR anonymous_id = ANY(${anon}::uuid[])`
    await tx`DELETE FROM cdp.sessions WHERE contact_id = ${p.contactId} OR anonymous_id = ANY(${anon}::uuid[])`
    await tx`DELETE FROM cdp.funnel_journeys WHERE contact_id = ${p.contactId} OR anonymous_id = ANY(${anon}::uuid[])`
    await tx`DELETE FROM cdp.identity_links WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.contact_identifiers WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.email_messages WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.email_enrollments WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.segment_memberships WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.duplicate_candidates WHERE contact_a = ${p.contactId} OR contact_b = ${p.contactId}`
    await tx`UPDATE cdp.destination_deliveries SET contact_id = NULL, request_summary = NULL, response_body = NULL WHERE contact_id = ${p.contactId}`
    await tx`DELETE FROM cdp.experiment_assignments WHERE visitor_key = ANY(${anon}::uuid[])`
    await tx`UPDATE cdp.consent_records SET contact_id = NULL, anonymous_id = NULL, session_id = NULL, user_agent = NULL, ip_trunc = NULL
      WHERE contact_id = ${p.contactId} OR anonymous_id = ANY(${anon}::uuid[])`
    await tx`DELETE FROM cdp.outbox WHERE key = ${p.contactId} AND topic <> 'contact.erased' AND published_at IS NULL`
    await tx`UPDATE cdp.audit_logs SET changes = '{"erased": true}'::jsonb WHERE entity = 'contacts' AND entity_id = ${p.contactId}`
    if (p.emailHash)
      await tx`INSERT INTO cdp.email_suppressions (email_hash, reason) VALUES (${p.emailHash}, 'erasure')
        ON CONFLICT (workspace_id, email_hash) DO UPDATE SET reason = 'erasure'`
    await tx`INSERT INTO cdp.erasure_tombstones (id, contact_id, email_hash, phone_hash, request_id)
      SELECT ${uuidv7()}, ${p.contactId}, ${p.emailHash ?? null}, ${p.phoneHash ?? null}, ${p.requestId ?? null}
      WHERE NOT EXISTS (SELECT 1 FROM cdp.erasure_tombstones WHERE contact_id = ${p.contactId})`
  })
}

/** After a manual merge in the CMS (FR-CRM-7): move all cdp history to the survivor. */
export async function repointMergedContact(
  sql: Sql,
  p: z.infer<typeof ContactMergedPayload>,
): Promise<void> {
  const { fromId, toId } = p
  await sql.begin(async (tx) => {
    await tx`UPDATE cdp.events SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.sessions SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.funnel_journeys SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.identity_links SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`INSERT INTO cdp.contact_identifiers (workspace_id, contact_id, kind, value, first_seen, last_seen)
      SELECT workspace_id, ${toId}, kind, value, first_seen, last_seen FROM cdp.contact_identifiers WHERE contact_id = ${fromId}
      ON CONFLICT (contact_id, kind, value) DO NOTHING`
    await tx`DELETE FROM cdp.contact_identifiers WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.email_messages SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.email_enrollments SET status = 'exited', exit_reason = 'merged', finished_at = now() WHERE contact_id = ${fromId} AND status IN ('active', 'paused')`
    await tx`UPDATE cdp.consent_records SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`UPDATE cdp.destination_deliveries SET contact_id = ${toId} WHERE contact_id = ${fromId}`
    await tx`DELETE FROM cdp.segment_memberships WHERE contact_id = ${fromId}`
  })
}
