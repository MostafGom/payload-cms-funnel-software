import type { DestinationSnapshot, DestinationType } from '@fp/contracts'
import type { DeliveryContext } from './types.ts'

/** Deterministic delivery context for adapter golden-fixture tests (NFR-13 contract tests). */
export function fixtureContext(
  type: DestinationType,
  over: Partial<DeliveryContext> = {},
): DeliveryContext {
  const destination: DestinationSnapshot = {
    id: 'dest-1',
    name: `${type} test`,
    type,
    enabled: true,
    testMode: false,
    testEventCode: 'TEST123',
    pixelId: '1234567890',
    browserPixel: true,
    endpointUrl: type === 'webhook' ? 'https://hooks.example.com/in' : undefined,
    eventMap: [],
    rateLimitPerSecond: 50,
    limitedDataUse: true,
    includeBots: false,
  }
  return {
    event: {
      eventId: '0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a59',
      name: 'form_submitted',
      platformEvent: {
        meta: 'Lead',
        tiktok: 'SubmitForm',
        snap: 'SIGN_UP',
        webhook: 'form.submitted',
      }[type],
      occurredAt: '2026-10-14T10:00:00.000Z',
      pageUrl:
        'https://go.brand.com/signup?utm_source=meta&fbclid=FBCLID&ttclid=TTCLID&ScCid=SCCID',
      referrer: 'https://l.facebook.com/',
      source: 'server',
      properties: { form_id: 'form-1', submission_id: 'sub-1' },
      clickIds: { fbclid: 'FBCLID', ttclid: 'TTCLID', ScCid: 'SCCID' },
      utm: { utm_source: 'meta', utm_medium: null, utm_campaign: 'spring' },
      ip: '203.0.113.77',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      geoCountry: 'us',
      geoRegion: 'CA',
      anonymousId: '0199d5a4-0f6b-7c3e-9a2b-0000000000a1',
      sessionId: '0199d5a4-0f6b-7c3e-9a2b-000000000001',
    },
    user: {
      contactId: '0199d5a4-0f6b-7c3e-9a2b-0000000000c1',
      email: 'Ada@Example.com',
      phone: '+14155550123',
      firstName: 'Ada',
      lastName: 'Lovelace',
      city: 'San Francisco',
      country: 'US',
      identifiers: {
        fbp: 'fb.1.1700000000000.111',
        fbc: 'fb.1.1700000000000.FBCLID',
        ttp: 'TTP',
        scid: 'SCID',
      },
    },
    destination,
    credentials: { accessToken: 'TOKEN', webhookSecret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw' },
    testMode: false,
    limitedDataUse: false,
    region: 'US-CA',
    ...over,
  }
}
