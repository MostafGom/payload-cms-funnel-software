import { z } from 'zod'
import { OutboxTopics } from '@fp/contracts'
import { repos } from '@fp/db'
import { uuidv7 } from '@fp/platform/ids'
import { requireAdmin } from '@/lib/admin-auth'
import { cdp } from '@/lib/cdp'

const Body = z.union([
  z.object({ deliveryIds: z.array(z.uuid()).min(1).max(1000) }),
  z.object({
    statuses: z.array(z.enum(['failed', 'dead', 'skipped_config', 'success'])).min(1),
    days: z.number().int().min(1).max(90),
    destinationId: z.string().optional(),
  }),
])

/** Manual and bulk replay (FR-DST-7): queues deliveries for re-send through the outbox. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request, ['owner', 'admin', 'marketer'])
  if (auth instanceof Response) return auth
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'invalid_request' }, { status: 400 })
  const { sql } = cdp()
  const rows =
    'deliveryIds' in parsed.data
      ? await sql<{ delivery_id: string; created_at: string }[]>`
          SELECT delivery_id, created_at FROM cdp.destination_deliveries WHERE delivery_id = ANY(${parsed.data.deliveryIds}::uuid[])`
      : await repos.findReplayable(sql, {
          statuses: parsed.data.statuses,
          since: new Date(Date.now() - parsed.data.days * 86_400_000).toISOString(),
          destinationId: parsed.data.destinationId,
          limit: 10_000,
        })
  if (rows.length)
    await repos.insertOutbox(sql, [
      {
        id: uuidv7(),
        workspaceId: 1,
        topic: OutboxTopics.destinationReplay,
        payload: {
          deliveries: rows.map((r) => ({
            deliveryId: r.delivery_id,
            createdAt: new Date(r.created_at).toISOString(),
          })),
        },
      },
    ])
  return Response.json({ ok: true, replayed: rows.length })
}
