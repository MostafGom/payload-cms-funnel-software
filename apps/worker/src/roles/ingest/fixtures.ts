import type { EnrichedEvent } from '@fp/event-schemas'
import { uuidv7 } from '@fp/platform/ids'

export function enrichedEvent(over: Partial<EnrichedEvent> = {}): EnrichedEvent {
  const now = new Date().toISOString()
  return {
    // Random ids: Valkey dedupe keys outlive a test run (48 h), so fixed ids would collide.
    event_id: uuidv7(),
    name: 'page_viewed',
    schema_v: 1,
    occurred_at: now,
    session_id: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a5a',
    anonymous_id: '0199d5a4-0f6b-7c3e-9a2b-aaaaaaaaaaaa',
    sdk_v: '1.0.0',
    page: {
      url: 'https://go.brand.com/offer?utm_source=fb&utm_campaign=fall&fbclid=F1&ScCid=S1&aff=9',
      path: '/offer',
      title: 'Offer',
    },
    context: { consent: { a: true, m: true } },
    properties: {},
    workspace_id: 1,
    source: 'browser',
    received_at: now,
    occurred_at_corrected: now,
    ip: '203.0.113.77',
    ip_trunc: '203.0.113.0',
    user_agent: 'Mozilla/5.0',
    device: { type: 'mobile', os: 'iOS', browser: 'Mobile Safari' },
    geo: { country: 'us', region: null, city: null },
    is_bot: false,
    consent_mask: 7,
    cookies: {},
    ...over,
  }
}
