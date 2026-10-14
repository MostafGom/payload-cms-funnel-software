import { describe, expect, it } from 'vitest'
import { assertPublicUrl, isPrivateAddress } from './http.ts'

describe('ADR-0014: SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fd00::1',
    '::ffff:10.0.0.1',
  ])('%s is private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })
  it.each(['8.8.8.8', '203.0.113.7', '2606:4700::1111'])('%s is public', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  )
  it('rejects http and private targets', async () => {
    await expect(assertPublicUrl('http://8.8.8.8/x')).rejects.toThrow(/https/)
    await expect(assertPublicUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow(
      /private/,
    )
    await expect(assertPublicUrl('https://localhost/x')).rejects.toThrow(/private|unresolvable/)
    await expect(
      assertPublicUrl('http://localhost:4010/x', { allowPrivate: true }),
    ).resolves.toBeInstanceOf(URL)
  })
})
