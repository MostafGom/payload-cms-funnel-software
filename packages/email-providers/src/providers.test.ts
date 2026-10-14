import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { postmarkProvider, ProviderError, resendProvider, sesProvider, sigV4 } from './index.ts'

let base = ''
const seen: { path: string; headers: Record<string, unknown>; body: string }[] = []
let status = 200
const server = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    seen.push({ path: req.url ?? '', headers: req.headers, body })
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ MessageID: 'pm-1', id: 're-1', MessageId: 'ses-1' }))
  })
})
beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, r))
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

const msg = {
  from: 'Brand <hi@brand.com>',
  to: 'ada@example.com',
  subject: 'Hi',
  html: '<p>x</p>',
  text: 'x',
  headers: { 'List-Unsubscribe': '<https://u>' },
  messageId: 'm1',
}

describe('FR-EML-3: provider adapters', () => {
  it('Postmark', async () => {
    expect(await postmarkProvider({ serverToken: 't', baseUrl: base }).send(msg)).toEqual({
      providerMessageId: 'pm-1',
    })
    const s = seen.at(-1)!
    expect(s.path).toBe('/email')
    expect(s.headers['x-postmark-server-token']).toBe('t')
    expect(JSON.parse(s.body).Headers).toEqual([{ Name: 'List-Unsubscribe', Value: '<https://u>' }])
  })
  it('Resend with idempotency key', async () => {
    expect(await resendProvider({ apiKey: 'k', baseUrl: base }).send(msg)).toEqual({
      providerMessageId: 're-1',
    })
    expect(seen.at(-1)!.headers['idempotency-key']).toBe('m1')
  })
  it('SES v2 signs requests', async () => {
    expect(
      await sesProvider({
        accessKeyId: 'AKID',
        secretAccessKey: 'S',
        region: 'eu-west-1',
        baseUrl: base,
      }).send(msg),
    ).toEqual({ providerMessageId: 'ses-1' })
    expect(String(seen.at(-1)!.headers.authorization)).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/eu-west-1\/ses\/aws4_request/,
    )
  })
  it('classifies failures as retryable or permanent', async () => {
    status = 503
    await expect(resendProvider({ apiKey: 'k', baseUrl: base }).send(msg)).rejects.toMatchObject({
      retryable: true,
    })
    status = 422
    const err = await resendProvider({ apiKey: 'k', baseUrl: base })
      .send(msg)
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ProviderError)
    expect((err as ProviderError).retryable).toBe(false)
    status = 200
  })
  it('SigV4 is deterministic for a fixed clock', () => {
    const a = sigV4({
      method: 'POST',
      host: 'h',
      path: '/p',
      body: '{}',
      region: 'us-east-1',
      service: 'ses',
      accessKeyId: 'A',
      secretAccessKey: 'S',
      now: new Date('2026-01-01T00:00:00Z'),
    })
    const b = sigV4({
      method: 'POST',
      host: 'h',
      path: '/p',
      body: '{}',
      region: 'us-east-1',
      service: 'ses',
      accessKeyId: 'A',
      secretAccessKey: 'S',
      now: new Date('2026-01-01T00:00:00Z'),
    })
    expect(a.authorization).toBe(b.authorization)
    expect(a['x-amz-date']).toBe('20260101T000000Z')
  })
})
