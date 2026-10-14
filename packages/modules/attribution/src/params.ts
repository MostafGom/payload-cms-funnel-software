/**
 * URL parameter capture (FR-FRM-3). Shared by the ingest worker (per event) and the form
 * submission pipeline (per lead) so both classify parameters identically.
 */

/** Ad-platform click identifiers. Keys are stored exactly as they appear in URLs. */
export const CLICK_ID_PARAMS = [
  'fbclid', // Meta
  'gclid', // Google Ads
  'gbraid', // Google Ads (iOS app->web)
  'wbraid', // Google Ads (web->app)
  'ttclid', // TikTok
  'ScCid', // Snapchat
  'msclkid', // Microsoft Ads
  'li_fat_id', // LinkedIn
  'twclid', // X/Twitter
  'rdt_cid', // Reddit
  'epik', // Pinterest
] as const

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
] as const
type UtmKey = (typeof UTM_KEYS)[number]

/** Params never stored because they commonly carry PII or secrets in links. */
const DENYLIST = new Set([
  'email',
  'e',
  'phone',
  'password',
  'token',
  'access_token',
  'auth',
  'code',
  'session',
])
const MAX_PARAMS = 50
const MAX_VALUE_LENGTH = 512

export interface Attribution {
  utm: Partial<Record<UtmKey, string>>
  clickIds: Record<string, string>
  /** every query parameter (minus denylisted keys), first value wins */
  params: Record<string, string>
}

export function extractAttribution(
  url: string | URL,
  extraDenylist: Iterable<string> = [],
): Attribution {
  const result: Attribution = { utm: {}, clickIds: {}, params: {} }
  let parsed: URL
  try {
    parsed = typeof url === 'string' ? new URL(url) : url
  } catch {
    return result
  }
  const deny = new Set([...DENYLIST, ...[...extraDenylist].map((k) => k.toLowerCase())])
  const clickIdsLower = new Map(CLICK_ID_PARAMS.map((k) => [k.toLowerCase(), k]))

  for (const [rawKey, rawValue] of parsed.searchParams) {
    if (Object.keys(result.params).length >= MAX_PARAMS) break
    const key = rawKey.trim()
    const value = rawValue.trim().slice(0, MAX_VALUE_LENGTH)
    if (!key || !value || deny.has(key.toLowerCase()) || key in result.params) continue

    result.params[key] = value
    const lower = key.toLowerCase()
    if ((UTM_KEYS as readonly string[]).includes(lower) && !(lower in result.utm))
      result.utm[lower as UtmKey] = value
    const clickKey = clickIdsLower.get(lower)
    if (clickKey && !(clickKey in result.clickIds)) result.clickIds[clickKey] = value
  }
  return result
}
