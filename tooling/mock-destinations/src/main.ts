import { serve } from '@hono/node-server'
import { Hono } from 'hono'

/**
 * Mock ad platforms, webhook receiver and email APIs for dev and e2e (plan §7). Records every
 * request; `/_requests` lists them, `DELETE /_requests` clears, `POST /_fail` injects failures
 * (`{ "path": "/meta", "status": 503, "times": 3 }`) for resilience tests. Never deploy this.
 */
interface Recorded {
  at: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: unknown
  raw: string
}
const recorded: Recorded[] = []
const failures: { path: string; status: number; times: number }[] = []

const app = new Hono()
app.get('/_requests', (c) => {
  const prefix = c.req.query('path') ?? ''
  return c.json(recorded.filter((r) => r.path.startsWith(prefix)))
})
app.delete('/_requests', (c) => {
  recorded.length = 0
  failures.length = 0
  return c.body(null, 204)
})
app.post('/_fail', async (c) => {
  failures.push((await c.req.json()) as (typeof failures)[number])
  return c.body(null, 204)
})

app.all('*', async (c) => {
  const raw = await c.req.text()
  let body: unknown = raw
  try {
    body = JSON.parse(raw)
  } catch {
    /* not json */
  }
  const path = c.req.path
  recorded.push({
    at: new Date().toISOString(),
    method: c.req.method,
    path,
    query: c.req.query(),
    headers: Object.fromEntries(c.req.raw.headers),
    body,
    raw,
  })
  if (recorded.length > 5000) recorded.shift()
  const f = failures.find((x) => path.startsWith(x.path) && x.times > 0)
  if (f) {
    f.times--
    return c.json({ error: { message: 'injected failure', is_transient: true } }, f.status as 503)
  }
  if (path.startsWith('/meta')) return c.json({ events_received: 1, fbtrace_id: 'mock' })
  if (path.startsWith('/tiktok')) return c.json({ code: 0, message: 'OK', request_id: 'mock' })
  if (path.startsWith('/snap')) return c.json({ status: 'VALID', reason: '' })
  if (path.startsWith('/email-api/email')) return c.json({ MessageID: crypto.randomUUID() })
  if (path.startsWith('/email-api/emails')) return c.json({ id: crypto.randomUUID() })
  return c.json({ ok: true })
})

const port = Number(process.env.MOCK_PORT ?? 4010)
serve({ fetch: app.fetch, port }, () => console.warn(`mock destinations on :${port}`))
