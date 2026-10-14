import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { OutboxTopics } from '@fp/contracts'
import { normalizeEmail } from '@fp/platform/crypto'
import { hasRole, type Role } from '@/cms/access/roles'
import { cdp } from './cdp'
import { appendOutbox } from './payload-tx'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/**
 * Executes a verified data-subject request (FR-CNS-4).
 *  - export: everything we hold about the person, as JSON on the request record
 *  - delete: CMS rows are deleted in one transaction, and a `contact.erased` outbox message makes
 *    the worker purge or pseudonymise `cdp` data and write a tombstone (hashes only)
 */
export async function executeDsar(req: PayloadRequest): Promise<Response> {
  const user = req.user as { roles?: Role[] } | null
  if (!hasRole(user, 'owner', 'admin')) return json({ error: 'forbidden' }, 403)
  const id = req.routeParams?.id as string | undefined
  if (!id) return json({ error: 'not_found' }, 404)
  const dsar = await req.payload.findByID({
    collection: 'dsar-requests',
    id,
    depth: 0,
    req,
    overrideAccess: true,
  })
  if (dsar.status !== 'verified') return json({ error: 'identity_not_verified' }, 409)

  const email = normalizeEmail(dsar.subjectEmail)
  const contactId =
    (typeof dsar.contact === 'object' ? dsar.contact?.id : dsar.contact) ??
    (email
      ? (
          await req.payload.find({
            collection: 'contacts',
            where: { email: { equals: email } },
            limit: 1,
            depth: 0,
            req,
            overrideAccess: true,
          })
        ).docs[0]?.id
      : undefined)

  if (!contactId) {
    await req.payload.update({
      collection: 'dsar-requests',
      id,
      data: {
        status: 'completed',
        completedAt: new Date().toISOString(),
        result: { found: false },
      },
      req,
      overrideAccess: true,
    })
    return json({ ok: true, found: false })
  }
  const cid = String(contactId)
  const { sql } = cdp()
  const anonymousIds = (
    await sql<
      { anonymous_id: string }[]
    >`SELECT anonymous_id FROM cdp.identity_links WHERE contact_id = ${cid}`
  ).map((r) => r.anonymous_id)

  if (dsar.type === 'export') {
    const contact = await req.payload.findByID({
      collection: 'contacts',
      id: cid,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const [submissions, notes] = await Promise.all([
      req.payload.find({
        collection: 'form-submissions',
        where: { contact: { equals: cid } },
        limit: 1000,
        depth: 0,
        req,
        overrideAccess: true,
      }),
      req.payload.find({
        collection: 'notes',
        where: { contact: { equals: cid } },
        limit: 1000,
        depth: 0,
        req,
        overrideAccess: true,
      }),
    ])
    const [events, consent, emails, identifiers] = await Promise.all([
      sql`SELECT event_id, occurred_at, name, page_url, referrer, utm_source, utm_medium, utm_campaign, click_ids, properties, device_type, os, browser, geo_country, ip_trunc::text
          FROM cdp.events WHERE contact_id = ${cid} OR anonymous_id = ANY(${anonymousIds}::uuid[]) ORDER BY occurred_at LIMIT 10000`,
      sql`SELECT recorded_at, region, regime, analytics, marketing, gpc, source, policy_version FROM cdp.consent_records WHERE contact_id = ${cid} OR anonymous_id = ANY(${anonymousIds}::uuid[])`,
      sql`SELECT created_at, kind, subject, status FROM cdp.email_messages WHERE contact_id = ${cid}`,
      sql`SELECT kind, value, first_seen, last_seen FROM cdp.contact_identifiers WHERE contact_id = ${cid}`,
    ])
    const result = {
      generatedAt: new Date().toISOString(),
      contact,
      submissions: submissions.docs,
      notes: notes.docs,
      events,
      consent,
      emails,
      identifiers,
      anonymousIds,
    }
    await req.payload.update({
      collection: 'dsar-requests',
      id,
      data: { status: 'completed', completedAt: new Date().toISOString(), contact: cid, result },
      req,
      overrideAccess: true,
    })
    return json({ ok: true, type: 'export', events: events.length })
  }

  // Erasure: one transaction for the CMS side + outbox, then the worker purges cdp.
  const shouldCommit = await initTransaction(req)
  try {
    const contact = await req.payload.findByID({
      collection: 'contacts',
      id: cid,
      depth: 0,
      req,
      overrideAccess: true,
    })
    const ctx = { skipContactEvents: true, actor: 'dsar' }
    const subs = await req.payload.delete({
      collection: 'form-submissions',
      where: { contact: { equals: cid } },
      req,
      overrideAccess: true,
      context: ctx,
    })
    const notes = await req.payload.delete({
      collection: 'notes',
      where: { contact: { equals: cid } },
      req,
      overrideAccess: true,
      context: ctx,
    })
    await req.payload.update({
      collection: 'dsar-requests',
      where: { contact: { equals: cid }, id: { not_equals: id } },
      data: { contact: null },
      req,
      overrideAccess: true,
    })
    await req.payload.delete({
      collection: 'contacts',
      id: cid,
      req,
      overrideAccess: true,
      context: ctx,
    })
    await appendOutbox(req, [
      {
        topic: OutboxTopics.contactErased,
        key: cid,
        payload: {
          contactId: cid,
          emailHash: contact.emailHash ?? undefined,
          phoneHash: contact.phoneHash ?? undefined,
          anonymousIds,
          requestId: String(id),
        },
      },
    ])
    await req.payload.update({
      collection: 'dsar-requests',
      id,
      data: {
        status: 'completed',
        completedAt: new Date().toISOString(),
        contact: null,
        subjectEmail: `erased+${String(id).slice(0, 8)}@invalid.local`,
        result: {
          erased: true,
          submissions: subs.docs.length,
          notes: notes.docs.length,
          anonymousIds: anonymousIds.length,
        },
      },
      req,
      overrideAccess: true,
    })
    if (shouldCommit) await commitTransaction(req)
  } catch (err) {
    await killTransaction(req)
    throw err
  }
  return json({ ok: true, type: 'delete' })
}
