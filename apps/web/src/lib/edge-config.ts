import { regimeFor, type Regime } from '@fp/consent'
import { ConsentSettingsSnapshot, ExperimentSnapshot } from '@fp/contracts'
import { repos } from '@fp/db'
import { cdp } from './cdp'

/**
 * Routing config for proxy.ts (ADR-0015/0016): running experiments keyed by host+path, and the
 * consent regime table. Loaded from config snapshots and cached in memory for a few seconds, so
 * the proxy costs no database round trip on the hot path.
 */
export interface ExperimentRoute {
  experimentId: string
  variants: { key: string; weight: number; path: string }[]
}

interface EdgeConfig {
  routes: Map<string, ExperimentRoute>
  consent: ConsentSettingsSnapshot | null
  loadedAt: number
}

const TTL_MS = 15_000
let cache: EdgeConfig | null = null
let loading: Promise<EdgeConfig> | null = null

async function load(): Promise<EdgeConfig> {
  const { sql } = cdp()
  const [experiments, consentRow] = await Promise.all([
    repos.listSnapshots(sql, 'experiment'),
    repos.getSnapshot(sql, 'consent_settings', 'global'),
  ])
  const routes = new Map<string, ExperimentRoute>()
  for (const row of experiments) {
    const e = ExperimentSnapshot.safeParse(row.data)
    if (!e.success || e.data.status !== 'running') continue
    const control = e.data.variants[0]
    if (!control?.host || !control.path) continue
    routes.set(`${control.host}${control.path}`, {
      experimentId: e.data.id,
      variants: e.data.variants
        .filter((v) => v.path)
        .map((v) => ({ key: v.key, weight: v.weight, path: v.path! })),
    })
  }
  const consent = consentRow ? ConsentSettingsSnapshot.safeParse(consentRow.data) : null
  return { routes, consent: consent?.success ? consent.data : null, loadedAt: Date.now() }
}

export async function edgeConfig(): Promise<EdgeConfig> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache
  loading ??= load()
    .then((c) => (cache = c))
    .catch(() => cache ?? { routes: new Map(), consent: null, loadedAt: Date.now() })
    .finally(() => {
      loading = null
    })
  // Serve stale while refreshing, block only on the very first load.
  return cache ?? loading
}

export const regimeWith = (cfg: EdgeConfig, region: string): Regime =>
  regimeFor(region, cfg.consent ?? undefined)
