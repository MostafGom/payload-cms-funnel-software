import { effective, gpc, regionHint, saveChoice, storedChoice, type Consent } from './consent.ts'
import { initPixels, pixelConversion, type PixelConfig } from './pixels.ts'
import { getCookie, nowIso, SDK_VERSION, setCookie, store, uuidv7 } from './util.ts'

/**
 * First-party tracker (FR-TRK-1/2, ADR-0005). Same-origin `/_t/e`, text/plain batches via
 * sendBeacon/fetch keepalive, bounded retry queue, consent-gated identifiers and pixels.
 */
interface Config {
  siteKey: string
  endpoint: string
  autocaptureClicks: boolean
  scrollDepth: boolean
  trackForms: boolean
  spaPageviews: boolean
  sessionTimeoutMinutes: number
  debug: boolean
  consent: { policyVersion: string; bannerVersion: string }
  pixels: PixelConfig[]
}
interface PageConfig {
  pageId?: string
  funnel?: { funnel_id: string; step_id?: string; variant_key?: string; experiment_id?: string }
  tracking?: { disabled?: boolean; noPixels?: boolean; noAutocapture?: boolean; pageEvent?: string }
}
interface Touch {
  url: string
  referrer?: string
  at: string
}
type Props = Record<string, unknown>

const MAX_QUEUE = 100
const BATCH = 20
const FLUSH_MS = 4000
const CLICK_ID =
  /^(fbclid|gclid|gbraid|wbraid|ttclid|sccid|msclkid|li_fat_id|twclid|rdt_cid|epik)$/i

const readJson = <T>(id: string): T | null => {
  try {
    return JSON.parse(document.getElementById(id)?.textContent ?? 'null') as T
  } catch {
    return null
  }
}

const cfg = readJson<Config>('fp-config')
const page = readJson<PageConfig>('fp-page') ?? {}
const session = store('session')
const local = store('local')
const log = (...a: unknown[]) => cfg?.debug && console.warn('[fp]', ...a)

let consent: Consent
let queue: unknown[] = session.get<unknown[]>('_fp_q') ?? []
let timer: ReturnType<typeof setTimeout> | undefined
let backoff = 0
let pixelsOn = false
let pageEventId = uuidv7()
const startedForms = new Map<string, string | undefined>()
const submittedForms = new Set<string>()

function sessionId(): string {
  const timeout = (cfg?.sessionTimeoutMinutes ?? 30) * 60_000
  const raw = consent.a ? getCookie('_cm_sid') : session.get<string>('_fp_sid')
  const [id, last] = (raw ?? '').split('.')
  const now = Date.now()
  const sid = id && last && now - Number(last) < timeout ? id : uuidv7()
  const value = `${sid}.${now}`
  if (consent.a) setCookie('_cm_sid', value, timeout / 1000)
  else session.set('_fp_sid', value)
  return sid
}

/** First/last attributed touch; persisted only with analytics consent (FR-FRM-8). */
function touches(): { first?: Touch; last?: Touch } {
  const s = consent.a ? local : session
  return { first: s.get<Touch>('_fp_ft') ?? undefined, last: s.get<Touch>('_fp_lt') ?? undefined }
}

function recordTouch(): void {
  const params = new URLSearchParams(location.search)
  const campaign = [...params.keys()].some((k) => k.startsWith('utm_') || CLICK_ID.test(k))
  let external = false
  try {
    external = !!document.referrer && new URL(document.referrer).host !== location.host
  } catch {
    /* opaque referrer */
  }
  if (!campaign && !external) return
  const t: Touch = { url: location.href, referrer: document.referrer || undefined, at: nowIso() }
  const s = consent.a ? local : session
  if (!s.get('_fp_ft')) s.set('_fp_ft', t)
  s.set('_fp_lt', t)
}

function envelope(name: string, properties: Props = {}, eventId = uuidv7()) {
  return {
    event_id: eventId,
    name,
    schema_v: 1,
    occurred_at: nowIso(),
    session_id: sessionId(),
    sdk_v: SDK_VERSION,
    page: {
      url: location.href.slice(0, 2048),
      path: location.pathname,
      referrer: document.referrer || undefined,
      title: document.title.slice(0, 512),
    },
    context: {
      locale: navigator.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: { w: screen.width, h: screen.height },
      consent,
    },
    funnel: page.funnel,
    properties,
  }
}

function track(name: string, properties: Props = {}, eventId?: string): string | undefined {
  if (!cfg || page.tracking?.disabled) return
  const e = envelope(name, properties, eventId)
  queue.push(e)
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
  session.set('_fp_q', queue)
  log('track', name, properties)
  if (queue.length >= BATCH) flush()
  else schedule()
  return e.event_id
}

function schedule(ms = FLUSH_MS) {
  if (!timer) timer = setTimeout(() => flush(), ms)
}

function flush(unloading = false): void {
  clearTimeout(timer)
  timer = undefined
  if (!cfg || !queue.length) return
  const batch = queue.slice(0, BATCH)
  const body = JSON.stringify({ v: 1, sk: cfg.siteKey, sent_at: nowIso(), batch })
  const done = () => {
    queue = queue.slice(batch.length)
    session.set('_fp_q', queue)
    backoff = 0
    if (queue.length) schedule(0)
  }
  if (unloading && navigator.sendBeacon?.(cfg.endpoint, new Blob([body], { type: 'text/plain' })))
    return done()
  fetch(cfg.endpoint, {
    method: 'POST',
    body,
    keepalive: body.length < 60_000,
    credentials: 'same-origin',
    headers: { 'content-type': 'text/plain' },
  })
    .then((r) => {
      // 4xx (other than 429) will never succeed: drop rather than retry forever.
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) return done()
      throw new Error(String(r.status))
    })
    .catch(() => {
      backoff = Math.min(60_000, (backoff || 1000) * 2)
      schedule(backoff)
    })
}

function pageview(): void {
  pageEventId = uuidv7()
  track('page_viewed', {}, pageEventId)
  if (page.funnel?.experiment_id && page.funnel.variant_key)
    track('experiment_exposed', {
      experiment_id: page.funnel.experiment_id,
      variant_key: page.funnel.variant_key,
    })
  if (page.tracking?.pageEvent) track(page.tracking.pageEvent)
  scrolled.clear()
}

function maybePixels(): void {
  if (pixelsOn || !consent.m || page.tracking?.noPixels || !cfg?.pixels.length) return
  pixelsOn = true
  initPixels(cfg.pixels, pageEventId)
}

function googleConsent(): void {
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
  const v = (b: boolean) => (b ? 'granted' : 'denied')
  gtag?.('consent', 'update', {
    ad_storage: v(consent.m),
    ad_user_data: v(consent.m),
    ad_personalization: v(consent.m),
    analytics_storage: v(consent.a),
  })
}

// ---- consent banner ----
const banner = () => document.querySelector<HTMLElement>('[data-fp-banner]')

function showBanner(withChoices: boolean): void {
  const b = banner()
  if (!b) return
  b.hidden = false
  const choices = b.querySelector<HTMLElement>('[data-fp-choices]')
  if (choices) choices.hidden = !withChoices
  for (const box of b.querySelectorAll<HTMLInputElement>('[data-fp-purpose]'))
    box.checked = box.dataset.fpPurpose === 'analytics' ? consent.a : consent.m
  b.querySelector<HTMLElement>(
    withChoices ? '[data-fp-purpose]' : '[data-fp-consent="accept"]',
  )?.focus()
}

function setConsent(a: boolean, m: boolean): void {
  if (!cfg) return
  saveChoice(cfg.consent.policyVersion, a, m)
  consent = effective(regionHint().regime, { a, m }, cfg.consent.policyVersion)
  const b = banner()
  if (b) b.hidden = true
  track('consent_updated', {
    analytics: consent.a,
    marketing: consent.m,
    gpc: gpc(),
    policy_version: cfg.consent.policyVersion,
    banner_version: cfg.consent.bannerVersion,
  })
  flush()
  googleConsent()
  maybePixels()
}

function onBannerClick(e: Event): void {
  const t = (e.target as HTMLElement).closest<HTMLElement>(
    '[data-fp-consent],[data-fp-consent-open]',
  )
  if (!t) return
  if (t.hasAttribute('data-fp-consent-open')) return showBanner(true)
  const action = t.dataset.fpConsent
  const b = banner()
  const choicesOpen = b?.querySelector<HTMLElement>('[data-fp-choices]')?.hidden === false
  if (action === 'accept') return setConsent(true, true)
  if (action === 'reject') return setConsent(false, false)
  if (action === 'choose') {
    if (!choicesOpen) return showBanner(true)
    const get = (p: string) =>
      !!b?.querySelector<HTMLInputElement>(`[data-fp-purpose="${p}"]`)?.checked
    setConsent(get('analytics'), get('marketing'))
  }
}

// ---- autocapture ----
const scrolled = new Set<number>()
function onScroll(): void {
  const h = document.documentElement
  const pct = Math.round(((h.scrollTop + innerHeight) / Math.max(1, h.scrollHeight)) * 100)
  for (const d of [25, 50, 75, 90])
    if (pct >= d && !scrolled.has(d)) {
      scrolled.add(d)
      track('scroll_depth_reached', { depth: d })
    }
}

function selectorOf(el: Element): string {
  const id = el.id ? `#${el.id}` : ''
  const cls = el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''
  return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 128)
}

function onClick(e: Event): void {
  const el = (e.target as Element).closest?.('a,button,[data-track]')
  if (!el || el.closest('[data-fp-banner]')) return
  const href = el instanceof HTMLAnchorElement ? el.href.split('?')[0] : undefined
  track('element_clicked', {
    selector: selectorOf(el),
    text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 64) || undefined,
    href,
    track: el.getAttribute('data-track') ?? undefined,
  })
}

function onFocus(e: Event): void {
  const el = e.target as HTMLInputElement
  const form = el.form?.getAttribute('data-fp-form')
  if (form && startedForms.has(form) && el.name && el.name !== '_hp')
    startedForms.set(form, el.name)
}

function onHide(): void {
  for (const [form, last] of startedForms)
    if (!submittedForms.has(form)) track('form_abandoned', { form_id: form, last_field: last })
  startedForms.clear()
  flush(true)
}

function patchHistory(): void {
  let last = location.pathname + location.search
  const changed = () => {
    const now = location.pathname + location.search
    if (now !== last) {
      last = now
      pageview()
    }
  }
  for (const m of ['pushState', 'replaceState'] as const) {
    const orig = history[m]
    history[m] = function (this: History, ...args: Parameters<History['pushState']>) {
      const r = orig.apply(this, args)
      setTimeout(changed, 0)
      return r
    }
  }
  addEventListener('popstate', changed)
}

// ---- public API ----
const api = {
  track: (name: string, props?: Props) => {
    if (name === 'form_started' && typeof props?.form_id === 'string')
      startedForms.set(props.form_id, undefined)
    return track(name, props)
  },
  /** Browser half of a server conversion: pixels only, sharing the server event id (FR-DST-4). */
  conversion: (name: string, eventId: string, data?: Props) => {
    if (name === 'form_submitted' && typeof data?.form_id === 'string')
      submittedForms.add(data.form_id)
    if (cfg && consent.m && !page.tracking?.noPixels)
      pixelConversion(cfg.pixels, name, eventId, data)
  },
  /** Tracking context sent with form submissions (FR-FRM-3/8). */
  submissionMeta: () => {
    const t = touches()
    return {
      sessionId: sessionId(),
      pageUrl: location.href,
      referrer: document.referrer || undefined,
      firstTouch: t.first,
      lastTouch: t.last,
      funnel: page.funnel
        ? {
            funnelId: page.funnel.funnel_id,
            stepId: page.funnel.step_id,
            variantKey: page.funnel.variant_key,
            experimentId: page.funnel.experiment_id,
          }
        : undefined,
      consent: { a: consent.a, m: consent.m, d: consent.d },
      locale: navigator.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  },
  consent: {
    get: () => ({ ...consent, ...regionHint() }),
    set: (c: { analytics: boolean; marketing: boolean }) => setConsent(c.analytics, c.marketing),
    open: () => showBanner(true),
  },
  flush: () => flush(),
  version: SDK_VERSION,
}

function init(): void {
  if (!cfg) return
  const { regime } = regionHint()
  consent = effective(regime, storedChoice(cfg.consent.policyVersion), cfg.consent.policyVersion)
  const pre = (window as unknown as { fp?: unknown }).fp
  ;(window as unknown as { fp: typeof api }).fp = api
  document.addEventListener('click', onBannerClick)
  if (regime === 'opt_in' && !consent.d) showBanner(false)
  if (page.tracking?.disabled) return

  recordTouch()
  pageview()
  maybePixels()
  googleConsent()
  if (cfg.autocaptureClicks && !page.tracking?.noAutocapture)
    document.addEventListener('click', onClick, true)
  if (cfg.scrollDepth) addEventListener('scroll', onScroll, { passive: true })
  if (cfg.trackForms) document.addEventListener('focusin', onFocus)
  if (cfg.spaPageviews) patchHistory()
  addEventListener('pagehide', onHide)
  document.addEventListener(
    'visibilitychange',
    () => document.visibilityState === 'hidden' && flush(true),
  )
  // Replay calls queued before the SDK loaded: window.fp = [['track', 'x', {...}], ...]
  if (Array.isArray(pre))
    for (const [m, ...a] of pre as [keyof typeof api, ...unknown[]][])
      (api[m] as (...x: unknown[]) => void)?.(...a)
}

init()

export type FpApi = typeof api
