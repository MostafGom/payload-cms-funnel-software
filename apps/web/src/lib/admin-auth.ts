import { headers } from 'next/headers'
import { getPayload, type Payload, type TypedUser } from 'payload'
import config from '@payload-config'
import { hasRole, type Role } from '@/cms/access/roles'

/** Admin API guard: Payload session (cookie or JWT) plus a role check, and same-origin for writes. */
export async function requireAdmin(
  request: Request,
  roles: Role[] = ['owner', 'admin'],
): Promise<{ payload: Payload; user: TypedUser } | Response> {
  const payload = await getPayload({ config })
  const h = await headers()
  const { user } = await payload.auth({ headers: h })
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasRole(user as { roles?: Role[] }, ...roles))
    return Response.json({ error: 'forbidden' }, { status: 403 })
  if (request.method !== 'GET') {
    const origin = h.get('origin')
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (!origin || new URL(origin).host !== host)
      return Response.json({ error: 'bad_origin' }, { status: 403 })
  }
  return { payload, user }
}
