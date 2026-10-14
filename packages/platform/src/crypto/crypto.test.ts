import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  decryptSecret,
  encryptSecret,
  normalizeCountry,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  parseKeyring,
  phoneForHashing,
  sha256Hex,
  truncateIp,
} from './index.ts'

describe('FR-DST-5: PII normalization and hashing', () => {
  it('normalizes email (trim + lowercase) and rejects garbage', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com')
    expect(normalizeEmail('not-an-email')).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
  })

  it('hashes to the known SHA-256 vector used by ad platforms', () => {
    expect(sha256Hex(normalizeEmail(' TEST@example.com')!)).toBe(
      '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b',
    )
  })

  it('normalizes phones to E.164 and strips + for hashing', () => {
    expect(normalizePhone('(415) 555-2671', 'US')).toBe('+14155552671')
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958')
    expect(normalizePhone('123')).toBeNull()
    expect(phoneForHashing('+14155552671')).toBe('14155552671')
  })

  it('normalizes names across scripts and countries', () => {
    expect(normalizeName("  O'Brien-Smith ")).toBe('obriensmith')
    expect(normalizeName('Zoë')).toBe('zoë')
    expect(normalizeName('محمد')).toBe('محمد')
    expect(normalizeCountry(' US ')).toBe('us')
    expect(normalizeCountry('USA')).toBeNull()
  })
})

describe('NFR-10: IP truncation', () => {
  it('truncates IPv4 to /24 and IPv6 to /48', () => {
    expect(truncateIp('203.0.113.77')).toBe('203.0.113.0')
    expect(truncateIp('::ffff:203.0.113.77')).toBe('203.0.113.0')
    expect(truncateIp('2001:db8:abcd:12:1:2:3:4')).toBe('2001:db8:abcd::')
    expect(truncateIp('2001:db8::1')).toBe('2001:db8:0::')
    expect(truncateIp('nonsense')).toBeNull()
  })
})

describe('NFR-10: secret encryption', () => {
  const k1 = randomBytes(32).toString('base64')
  const k2 = randomBytes(32).toString('base64')

  it('round-trips and supports key rotation', () => {
    const old = parseKeyring(`k1:${k1}`, 'k1')
    const token = encryptSecret('meta-access-token', old)
    expect(token.startsWith('v1.k1.')).toBe(true)

    const rotated = parseKeyring(`k1:${k1},k2:${k2}`, 'k2')
    expect(decryptSecret(token, rotated)).toBe('meta-access-token')
    expect(encryptSecret('x', rotated).startsWith('v1.k2.')).toBe(true)
  })

  it('rejects tampered ciphertext', () => {
    const ring = parseKeyring(`k1:${k1}`, 'k1')
    const parts = encryptSecret('secret', ring).split('.')
    parts[4] = Buffer.from('tampered').toString('base64url')
    expect(() => decryptSecret(parts.join('.'), ring)).toThrow()
  })
})
