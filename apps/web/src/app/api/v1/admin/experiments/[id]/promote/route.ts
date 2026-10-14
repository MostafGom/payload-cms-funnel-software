import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Promote the winner (FR-FUN-5): all traffic goes to the winning variant (weights 100/0) while the
 * public URL stays the same, so ads and links keep working. Reversible by editing the weights.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request, ['owner', 'admin', 'marketer'])
  if (auth instanceof Response) return auth
  const { id } = await params
  const body = z
    .object({ variantKey: z.string() })
    .safeParse(await request.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'invalid_request' }, { status: 400 })
  const exp = await auth.payload.findByID({
    collection: 'experiments',
    id,
    depth: 0,
    overrideAccess: true,
  })
  if (!exp.variants.some((v) => v.key === body.data.variantKey))
    return Response.json({ error: 'unknown_variant' }, { status: 400 })
  await auth.payload.update({
    collection: 'experiments',
    id,
    user: auth.user,
    overrideAccess: true,
    data: {
      winner: body.data.variantKey,
      endedAt: new Date().toISOString(),
      variants: exp.variants.map((v) => ({
        ...v,
        weight: v.key === body.data.variantKey ? 100 : 0,
      })),
    },
  })
  return Response.json({ ok: true })
}
