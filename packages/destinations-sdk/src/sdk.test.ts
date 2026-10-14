import { describe, expect, it } from 'vitest'
import { sha256Hex } from '@fp/platform/crypto'
import { classifyHttp, hashUser, nextRetryDelay, RETRY_HORIZON_MS } from './index.ts'

describe('FR-DST-5: user data hashing', () => {
  it('normalizes then hashes (Meta/TikTok/Snap advanced matching rules)', () => {
    const u = hashUser({
      contactId: 'c1',
      email: ' Ada@Example.com ',
      phone: '+1 (415) 555-0123',
      firstName: 'Ada ',
      lastName: "O'Neil",
      city: 'San Francisco',
      country: 'US',
      identifiers: {},
    })
    expect(u.em).toBe(sha256Hex('ada@example.com'))
    expect(u.ph).toBe(sha256Hex('14155550123'))
    expect(u.fn).toBe(sha256Hex('ada'))
    expect(u.ln).toBe(sha256Hex('oneil'))
    expect(u.ct).toBe(sha256Hex('sanfrancisco'))
    expect(u.country).toBe(sha256Hex('us'))
    expect(u.external_id).toBe(sha256Hex('c1'))
  })
  it('known test vector', () => {
    // SHA-256("test@example.com")
    expect(sha256Hex('test@example.com')).toBe(
      '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b',
    )
  })
})

describe('ADR-0010: classification and retry policy', () => {
  it('classifies HTTP outcomes', () => {
    const h = new Headers({ 'retry-after': '30' })
    expect(classifyHttp(200, new Headers())).toEqual({ outcome: 'success' })
    expect(classifyHttp(429, h)).toEqual({
      outcome: 'retry',
      reason: 'http_429',
      retryAfterMs: 30_000,
    })
    expect(classifyHttp(503, new Headers())).toMatchObject({ outcome: 'retry' })
    expect(classifyHttp(400, new Headers())).toEqual({ outcome: 'fatal', reason: 'http_400' })
  })
  it('backs off exponentially, honours Retry-After, and stops at 72h', () => {
    expect(nextRetryDelay(1, 0, undefined, () => 0)).toBe(7_500)
    expect(nextRetryDelay(5, 0, undefined, () => 1)).toBe(240_000)
    expect(nextRetryDelay(20, 0, undefined, () => 1)).toBe(2 * 3600 * 1000)
    expect(nextRetryDelay(1, 0, 60_000, () => 0)).toBe(60_000)
    expect(nextRetryDelay(3, RETRY_HORIZON_MS)).toBeNull()
    expect(nextRetryDelay(20, RETRY_HORIZON_MS - 1000, undefined, () => 1)).toBe(1000)
  })
})
