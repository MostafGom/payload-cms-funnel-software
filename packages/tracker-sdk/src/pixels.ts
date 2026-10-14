/**
 * Browser pixels, loaded only after marketing consent (FR-DST-1..4). Conversions pass our
 * event id so each platform dedupes against the server-side event.
 */
export interface PixelConfig {
  type: 'meta' | 'tiktok' | 'snap'
  id: string
  events: Record<string, string>
}
type AnyFn = ((...a: unknown[]) => void) & Record<string, unknown>
type W = Window & Record<string, unknown>

function loadScript(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

function queueFn(name: string, pushName = 'queue'): AnyFn {
  const w = window as unknown as W
  if (w[name]) return w[name] as AnyFn
  const q: unknown[] = []
  const f = function (...args: unknown[]) {
    const self = f as AnyFn
    if (typeof self.callMethod === 'function')
      (self.callMethod as (...a: unknown[]) => void)(...args)
    else q.push(args)
  } as AnyFn
  f[pushName] = q
  f.push = f
  f.loaded = true
  f.version = '2.0'
  w[name] = f
  return f
}

export function initPixels(pixels: PixelConfig[], pageEventId: string): void {
  for (const p of pixels) {
    if (p.type === 'meta') {
      const fbq = queueFn('fbq')
      ;(window as unknown as W)._fbq ??= fbq
      loadScript('https://connect.facebook.net/en_US/fbevents.js')
      fbq('init', p.id)
      fbq('track', 'PageView', {}, { eventID: pageEventId })
    } else if (p.type === 'tiktok') {
      const w = window as unknown as W
      w.TiktokAnalyticsObject = 'ttq'
      const ttq = (w.ttq ??= []) as unknown[] & Record<string, unknown>
      for (const m of ['page', 'track', 'identify'])
        ttq[m] ??= (...a: unknown[]) => ttq.push([m, ...a])
      loadScript(
        `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(p.id)}&lib=ttq`,
      )
      ;(ttq.page as AnyFn)()
    } else if (p.type === 'snap') {
      const snaptr = queueFn('snaptr')
      loadScript('https://sc-static.net/scevent.min.js')
      snaptr('init', p.id, {})
      snaptr('track', 'PAGE_VIEW', { client_dedup_id: pageEventId })
    }
  }
}

export function pixelConversion(
  pixels: PixelConfig[],
  name: string,
  eventId: string,
  data: Record<string, unknown> = {},
): void {
  const w = window as unknown as W
  for (const p of pixels) {
    const target = p.events[name]
    if (!target) continue
    if (p.type === 'meta' && w.fbq) (w.fbq as AnyFn)('track', target, data, { eventID: eventId })
    if (p.type === 'tiktok' && w.ttq)
      ((w.ttq as Record<string, AnyFn>).track as AnyFn)(target, data, { event_id: eventId })
    if (p.type === 'snap' && w.snaptr)
      (w.snaptr as AnyFn)('track', target, { client_dedup_id: eventId })
  }
}
