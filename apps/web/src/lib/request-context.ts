import { unstable_cache } from 'next/cache'
import {
  normalizeRegion,
  regimeFor,
  resolveConsent,
  type EffectiveConsent,
  type Regime,
} from '@fp/consent'
import { ConsentSettingsSnapshot } from '@fp/contracts'
import { repos } from '@fp/db'
import { SITE_CONFIG_TAG } from '@/cms/hooks/revalidate'
import { cdp } from './cdp'
import { serverEnv } from './env'

type HeaderBag = { get(name: string): string | null }

export function clientIp(h: HeaderBag): string | null {
  return h.get(serverEnv().CLIENT_IP_HEADER)?.split(',')[0]?.trim() || null
}

/**
 * Region from the edge (Cloudflare `cf-ipcountry` + `cf-region-code`). `x-fp-debug-geo: US-CA`
 * overrides it only when ALLOW_DEBUG_GEO=true (consent test matrix, never in production).
 */
export function regionFromHeaders(h: HeaderBag, allowDebug = serverEnv().ALLOW_DEBUG_GEO): string {
  const debug = allowDebug ? h.get('x-fp-debug-geo') : null
  if (debug) {
    const [c, s] = debug.split('-')
    return normalizeRegion(c, s)
  }
  return normalizeRegion(h.get('cf-ipcountry'), h.get('cf-region-code'))
}

export const getConsentSettings = unstable_cache(
  async (): Promise<ConsentSettingsSnapshot | null> => {
    const row = await repos.getSnapshot(cdp().sql, 'consent_settings', 'global')
    const parsed = row ? ConsentSettingsSnapshot.safeParse(row.data) : null
    return parsed?.success ? parsed.data : null
  },
  ['consent-settings-snapshot'],
  { tags: [SITE_CONFIG_TAG], revalidate: 300 },
)

export async function regimeForRequest(h: HeaderBag): Promise<{ region: string; regime: Regime }> {
  const region = regionFromHeaders(h)
  const settings = await getConsentSettings()
  return { region, regime: regimeFor(region, settings ?? undefined) }
}

/** Effective consent for a request (FR-CNS-3): server regime + client choice + GPC. */
export async function consentForRequest(
  h: HeaderBag,
  choice: { a: boolean; m: boolean; d?: boolean } | undefined,
): Promise<EffectiveConsent & { region: string }> {
  const { region, regime } = await regimeForRequest(h)
  const decided = choice && choice.d !== false
  const c = resolveConsent({
    regime,
    choice: decided ? { analytics: choice.a, marketing: choice.m } : null,
    gpc: h.get('sec-gpc') === '1',
  })
  return { ...c, region }
}
