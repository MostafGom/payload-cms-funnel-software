// Constant load with a run tag in sdk_v, exporting the number of accepted batches (resilience test).
import http from 'k6/http'
import { Counter } from 'k6/metrics'
import crypto from 'k6/crypto'

const accepted = new Counter('accepted_events')
const RUN = __ENV.RUN || 'run'
export const options = {
  scenarios: {
    load: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 40),
      timeUnit: '1s',
      duration: __ENV.DURATION || '120s',
      preAllocatedVUs: 100,
    },
  },
}
const uuid4 = () => {
  const h = Array.from(new Uint8Array(crypto.randomBytes(16)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
export default function () {
  const now = new Date().toISOString()
  const batch = Array.from({ length: 5 }, () => ({
    event_id: uuid4(),
    name: 'page_viewed',
    occurred_at: now,
    session_id: uuid4(),
    sdk_v: RUN,
    page: { url: 'https://go.brand.com/', path: '/' },
    context: { consent: { a: true, m: true, d: true } },
  }))
  const res = http.post(
    `${__ENV.BASE_URL || 'http://localhost:8080'}/_t/e`,
    JSON.stringify({ v: 1, sk: 'dev-site', sent_at: now, batch }),
    {
      headers: {
        'content-type': 'text/plain',
        'user-agent': 'Mozilla/5.0 Chrome/130.0',
        'cf-ipcountry': 'US',
      },
      timeout: '5s',
    },
  )
  // Only 204 means "accepted": the SDK retries anything else, so those are not counted as owed.
  if (res.status === 204) accepted.add(5)
}
