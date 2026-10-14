import { isIPv4, isIPv6 } from 'node:net'

/**
 * Stored IPs are truncated: IPv4 to /24, IPv6 to /48 (ADR-0012). Full IPs only live in transient
 * stream/job payloads for CAPI.
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const mapped = ip.startsWith('::ffff:') && isIPv4(ip.slice(7)) ? ip.slice(7) : ip
  if (isIPv4(mapped)) {
    const [a, b, c] = mapped.split('.')
    return `${a}.${b}.${c}.0`
  }
  if (isIPv6(mapped)) {
    const groups = expandIpv6(mapped)
    return `${groups.slice(0, 3).join(':')}::`
  }
  return null
}

function expandIpv6(ip: string): string[] {
  const [head = '', tail = ''] = ip.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const missing = ip.includes('::') ? 8 - h.length - t.length : 0
  return [...h, ...Array<string>(missing).fill('0'), ...t].map((g) =>
    g.toLowerCase().replace(/^0+(?=.)/, ''),
  )
}
