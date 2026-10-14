declare const __SDK_VERSION__: string
export const SDK_VERSION = typeof __SDK_VERSION__ === 'string' ? __SDK_VERSION__ : 'dev'

/** RFC 9562 UUIDv7: time-ordered, so event ids sort and index well (ADR-0009). */
export function uuidv7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  let ts = Date.now()
  for (let i = 5; i >= 0; i--) {
    b[i] = ts & 0xff
    ts = Math.floor(ts / 256)
  }
  b[6] = (b[6]! & 0x0f) | 0x70
  b[8] = (b[8]! & 0x3f) | 0x80
  let h = ''
  for (const x of b) h += (x < 16 ? '0' : '') + x.toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function getCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`),
  )
  return m ? decodeURIComponent(m[1]!) : null
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

/** Storage that never throws (Safari private mode, blocked storage). */
export function store(kind: 'local' | 'session') {
  const s = (): Storage | null => {
    try {
      return kind === 'local' ? localStorage : sessionStorage
    } catch {
      return null
    }
  }
  return {
    get<T>(k: string): T | null {
      try {
        const v = s()?.getItem(k)
        return v ? (JSON.parse(v) as T) : null
      } catch {
        return null
      }
    },
    set(k: string, v: unknown): void {
      try {
        s()?.setItem(k, JSON.stringify(v))
      } catch {
        /* quota or disabled */
      }
    },
    del(k: string): void {
      try {
        s()?.removeItem(k)
      } catch {
        /* ignore */
      }
    },
  }
}

export const nowIso = () => new Date().toISOString()
