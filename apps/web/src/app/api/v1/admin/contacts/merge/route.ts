import { commitTransaction, createLocalReq, initTransaction, killTransaction } from 'payload'
import { sql as dsql } from '@payloadcms/db-postgres'
import { z } from 'zod'
import { OutboxTopics } from '@fp/contracts'
import { requireAdmin } from '@/lib/admin-auth'
import { appendOutbox, txExecute } from '@/lib/payload-tx'

const Body = z.object({
  a: z.uuid(),
  b: z.uuid(),
  action: z.enum(['merge_into_a', 'merge_into_b', 'dismiss']),
})

/**
 * Manual duplicate merge (FR-CRM-7). The survivor keeps its values and gains the loser's where it
 * has none; relations move; the loser is marked merged. cdp rows move asynchronously.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request, ['owner', 'admin', 'marketer', 'support'])
  if (auth instanceof Response) return auth
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'invalid_request' }, { status: 400 })
  const { a, b, action } = parsed.data
  const [lo, hi] = [a, b].sort()
  const req = await createLocalReq({ user: auth.user, context: { actor: 'merge' } }, auth.payload)
  const shouldCommit = await initTransaction(req)
  try {
    if (action !== 'dismiss') {
      const [toId, fromId] = action === 'merge_into_a' ? [a, b] : [b, a]
      const to = await auth.payload.findByID({
        collection: 'contacts',
        id: toId,
        depth: 0,
        req,
        overrideAccess: true,
      })
      const from = await auth.payload.findByID({
        collection: 'contacts',
        id: fromId,
        depth: 0,
        req,
        overrideAccess: true,
      })
      const ids = (v: unknown[] | null | undefined) =>
        (v ?? []).map((x) =>
          typeof x === 'object' && x ? (x as { id: string }).id : (x as string),
        )
      // Free the unique email first, then fill the survivor's gaps.
      await auth.payload.update({
        collection: 'contacts',
        id: fromId,
        req,
        overrideAccess: true,
        context: { skipContactEvents: true },
        data: { status: 'merged', mergedInto: toId, email: null, phone: null },
      })
      await auth.payload.update({
        collection: 'contacts',
        id: toId,
        req,
        overrideAccess: true,
        data: {
          email: to.email ?? from.email,
          phone: to.phone ?? from.phone,
          firstName: to.firstName ?? from.firstName,
          lastName: to.lastName ?? from.lastName,
          country: to.country ?? from.country,
          city: to.city ?? from.city,
          tags: [...new Set([...ids(to.tags), ...ids(from.tags)])],
          lists: [...new Set([...ids(to.lists), ...ids(from.lists)])],
          customFields: {
            ...((from.customFields as object) ?? {}),
            ...((to.customFields as object) ?? {}),
          },
          marketingStatus:
            to.marketingStatus === 'none' ? from.marketingStatus : to.marketingStatus,
        },
      })
      await auth.payload.update({
        collection: 'form-submissions',
        where: { contact: { equals: fromId } },
        data: { contact: toId },
        req,
        overrideAccess: true,
      })
      await auth.payload.update({
        collection: 'notes',
        where: { contact: { equals: fromId } },
        data: { contact: toId },
        req,
        overrideAccess: true,
      })
      await appendOutbox(req, [
        { topic: OutboxTopics.contactMerged, key: toId, payload: { fromId, toId } },
      ])
    }
    await txExecute(
      req,
      dsql`UPDATE cdp.duplicate_candidates SET status = ${action === 'dismiss' ? 'dismissed' : 'merged'}, resolved_at = now()
      WHERE contact_a = ${lo} AND contact_b = ${hi}`,
    )
    if (shouldCommit) await commitTransaction(req)
  } catch (err) {
    await killTransaction(req)
    throw err
  }
  return Response.json({ ok: true })
}
