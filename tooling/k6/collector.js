// Load test for the collector (NFR-2, Phase 1A exit: 300 events/s meets SLOs; spike 1000/s).
//   docker run --rm --network host -v $PWD/tooling/k6:/k6 grafana/k6:1.3.0 run /k6/collector.js
//   (env: BASE_URL=http://localhost:8080 SITE_KEY=dev-site PROFILE=smoke|steady|spike)
import http from 'k6/http'
import { check } from 'k6'
import crypto from 'k6/crypto'

const BASE = __ENV.BASE_URL || 'http://localhost:8080'
const SITE_KEY = __ENV.SITE_KEY || 'dev-site'
const EVENTS_PER_BATCH = 5
const profiles = {
  smoke: {
    executor: 'constant-arrival-rate',
    rate: 20,
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 20,
  },
  // 300 events/s = 60 batches/s of 5 events, for 15 minutes.
  steady: {
    executor: 'constant-arrival-rate',
    rate: 60,
    timeUnit: '1s',
    duration: '15m',
    preAllocatedVUs: 100,
  },
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 60,
    timeUnit: '1s',
    preAllocatedVUs: 400,
    stages: [
      { target: 200, duration: '30s' },
      { target: 200, duration: '2m' },
      { target: 60, duration: '30s' },
      { target: 60, duration: '2m' },
    ],
  },
}
export const options = {
  scenarios: { collector: profiles[__ENV.PROFILE || 'smoke'] },
  thresholds: {
    // Includes network and proxy: server-side p95 must be < 30 ms; allow headroom end to end.
    http_req_duration: ['p(95)<60', 'p(99)<150'],
    http_req_failed: ['rate<0.001'],
  },
}

const uuid7 = () => {
  const b = new Uint8Array(crypto.randomBytes(16))
  let ts = Date.now()
  for (let i = 5; i >= 0; i--) {
    b[i] = ts & 0xff
    ts = Math.floor(ts / 256)
  }
  b[6] = (b[6] & 0x0f) | 0x70
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export default function () {
  const now = new Date().toISOString()
  const session = uuid7()
  const batch = Array.from({ length: EVENTS_PER_BATCH }, (_, i) => ({
    event_id: uuid7(),
    name: i === 0 ? 'page_viewed' : 'element_clicked',
    occurred_at: now,
    session_id: session,
    sdk_v: 'k6',
    page: { url: 'https://go.brand.com/?utm_source=k6&fbclid=K6', path: '/' },
    context: { consent: { a: true, m: true, d: true } },
    properties: i === 0 ? {} : { selector: 'a.button', text: 'Sign up' },
  }))
  const res = http.post(
    `${BASE}/_t/e`,
    JSON.stringify({ v: 1, sk: SITE_KEY, sent_at: now, batch }),
    {
      headers: {
        'content-type': 'text/plain',
        'user-agent': 'Mozilla/5.0 (k6 load test) Chrome/130.0',
        'cf-ipcountry': 'US',
      },
    },
  )
  check(res, { accepted: (r) => r.status === 204 })
}
