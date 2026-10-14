import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createLogger } from '@fp/platform/logger'
import { submitForm } from '@/lib/submissions'

const logger = createLogger({ service: 'web', level: process.env.LOG_LEVEL ?? 'info' }).child({
  route: 'form-submit',
})
const MAX_BODY = 32 * 1024

/** POST /api/v1/forms/:id/submissions (ADR-0021). Thin adapter over `submitForm`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const text = await request.text()
  if (text.length > MAX_BODY) return Response.json({ error: 'payload_too_large' }, { status: 413 })
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const jar = await cookies()
  const result = await submitForm({
    payload: await getPayload({ config }),
    logger,
    formId: id,
    raw,
    headers: await headers(),
    cookies: new Map(jar.getAll().map((c) => [c.name, c.value])),
  })
  return Response.json(result.body, {
    status: result.status,
    headers: {
      'cache-control': 'no-store',
      ...(result.status === 429 ? { 'retry-after': '60' } : {}),
    },
  })
}
