/**
 * Frequentist two-proportion z-test against the control plus a sample-ratio-mismatch (SRM) check
 * (FR-FUN-5). Kept deliberately simple and explainable; peeking is mitigated by requiring a
 * minimum sample before declaring a winner.
 */
export interface Arm {
  key: string
  visitors: number
  conversions: number
  weight?: number
}

export interface ArmResult extends Arm {
  rate: number
  /** relative lift vs control */
  lift: number | null
  /** two-sided p-value vs control */
  pValue: number | null
  /** 95% CI of the absolute difference vs control */
  ci95: [number, number] | null
  significant: boolean
}

/** Abramowitz-Stegun approximation of the standard normal CDF. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

export function compareArms(
  arms: Arm[],
  opts: { alpha?: number; minVisitors?: number } = {},
): ArmResult[] {
  const alpha = opts.alpha ?? 0.05
  const minVisitors = opts.minVisitors ?? 100
  const control = arms[0]
  return arms.map((a, i) => {
    const rate = a.visitors ? a.conversions / a.visitors : 0
    if (i === 0 || !control)
      return { ...a, rate, lift: null, pValue: null, ci95: null, significant: false }
    const p1 = control.visitors ? control.conversions / control.visitors : 0
    const p2 = rate
    const pooled =
      (control.conversions + a.conversions) / Math.max(1, control.visitors + a.visitors)
    const se = Math.sqrt(
      pooled * (1 - pooled) * (1 / Math.max(1, control.visitors) + 1 / Math.max(1, a.visitors)),
    )
    const z = se > 0 ? (p2 - p1) / se : 0
    const pValue = se > 0 ? 2 * (1 - normalCdf(Math.abs(z))) : 1
    const seDiff = Math.sqrt(
      (p1 * (1 - p1)) / Math.max(1, control.visitors) + (p2 * (1 - p2)) / Math.max(1, a.visitors),
    )
    const ci95: [number, number] = [p2 - p1 - 1.96 * seDiff, p2 - p1 + 1.96 * seDiff]
    const enough = a.visitors >= minVisitors && control.visitors >= minVisitors
    return {
      ...a,
      rate,
      lift: p1 > 0 ? (p2 - p1) / p1 : null,
      pValue,
      ci95,
      significant: enough && pValue < alpha,
    }
  })
}

/** Chi-square goodness of fit of observed visitors vs configured weights; p < 0.001 flags SRM. */
export function sampleRatioMismatch(arms: Arm[]): {
  chi2: number
  pValue: number
  mismatch: boolean
} {
  const total = arms.reduce((a, x) => a + x.visitors, 0)
  const wTotal = arms.reduce((a, x) => a + (x.weight ?? 1), 0)
  let chi2 = 0
  for (const a of arms) {
    const expected = (total * (a.weight ?? 1)) / wTotal
    if (expected > 0) chi2 += (a.visitors - expected) ** 2 / expected
  }
  const df = Math.max(1, arms.length - 1)
  // Wilson-Hilferty transform to approximate the chi-square upper tail with the normal CDF.
  const z = (Math.cbrt(chi2 / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df))
  const pValue = 1 - normalCdf(z)
  return { chi2, pValue, mismatch: total > 0 && pValue < 0.001 }
}

/** Winner = significant positive arm with the best rate, else null (keep running). */
export function pickWinner(results: ArmResult[]): string | null {
  const winners = results
    .filter((r) => r.significant && (r.lift ?? 0) > 0)
    .sort((a, b) => b.rate - a.rate)
  return winners[0]?.key ?? null
}
