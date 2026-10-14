import { describe, expect, it } from 'vitest'
import { fixtureContext } from '@fp/destinations-sdk/fixture'
import { signStandardWebhook, verifyStandardWebhook, webhook } from './index.ts'

describe('FR-DST-9: Standard Webhooks', () => {
  it('matches the Standard Webhooks reference test vector', () => {
    expect(
      signStandardWebhook(
        'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
        'msg_p5jXN8AQM9LWM0D4loKWxJek',
        1614265330,
        '{"test": 2432232314}',
      ),
    ).toBe('v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=')
  })
  it('produces a request any Standard Webhooks verifier accepts', () => {
    const r = webhook.prepare(fixtureContext('webhook'))
    const ok = verifyStandardWebhook(
      'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
      {
        id: r.headers['webhook-id']!,
        timestamp: r.headers['webhook-timestamp']!,
        signature: r.headers['webhook-signature']!,
      },
      r.body,
    )
    expect(ok).toBe(true)
    expect(r.headers['webhook-id']).toBe('msg_0199d5a4-0f6b-7c3e-9a2b-6f1d2c3b4a59')
    const body = JSON.parse(r.body)
    expect(body).toMatchObject({
      type: 'form.submitted',
      data: {
        contact: { email: 'Ada@Example.com' },
        attribution: { click_ids: { fbclid: 'FBCLID' } },
      },
    })
  })
  it('rejects tampered bodies and stale timestamps', () => {
    const r = webhook.prepare(fixtureContext('webhook'))
    const h = {
      id: r.headers['webhook-id']!,
      timestamp: r.headers['webhook-timestamp']!,
      signature: r.headers['webhook-signature']!,
    }
    expect(verifyStandardWebhook('whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', h, `${r.body} `)).toBe(
      false,
    )
    expect(
      verifyStandardWebhook(
        'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
        h,
        r.body,
        300,
        Date.now() + 3_600_000,
      ),
    ).toBe(false)
  })
})
