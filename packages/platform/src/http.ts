import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * SSRF guard for user-configured outbound URLs (webhooks, ADR-0014): https only, and the host
 * must not resolve to loopback, private, link-local, CGNAT or cloud metadata ranges.
 */
export class UnsafeUrlError extends Error {}

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number]
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    )
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7))
  return (
    v === '::1' ||
    v === '::' ||
    v.startsWith('fc') ||
    v.startsWith('fd') ||
    v.startsWith('fe8') ||
    v.startsWith('fe9') ||
    v.startsWith('fea') ||
    v.startsWith('feb')
  )
}

export async function assertPublicUrl(
  url: string,
  opts: { allowPrivate?: boolean } = {},
): Promise<URL> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new UnsafeUrlError('invalid url')
  }
  if (opts.allowPrivate) return u
  if (u.protocol !== 'https:') throw new UnsafeUrlError('https required')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addrs.length) throw new UnsafeUrlError('unresolvable host')
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new UnsafeUrlError('private address')
  return u
}
