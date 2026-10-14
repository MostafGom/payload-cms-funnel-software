import { getPayload } from 'payload'
import config from '@payload-config'

/** Readiness: Payload initialised and the database answers (deploy gate, ADR-0019). */
export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'domains', overrideAccess: true })
    return new Response('ok')
  } catch {
    return new Response('not ready', { status: 503 })
  }
}
