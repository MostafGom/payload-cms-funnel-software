/**
 * Deterministic weighted assignment (FR-FUN-5, ADR-0016). The same visitor key and experiment
 * always map to the same variant, so assignment is sticky even if the cookie write races, and
 * the edge (proxy.ts) needs no database round trip. Pure and runtime-agnostic (Edge/Node).
 */
export interface Variant {
  key: string
  weight: number
}

/** 32-bit FNV-1a; uniform enough for bucketing and identical in every runtime. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Bucket in [0, 1). */
export const bucket = (experimentId: string, visitorKey: string): number =>
  fnv1a(`${experimentId}:${visitorKey}`) / 0x1_0000_0000

export function assignVariant(
  experimentId: string,
  visitorKey: string,
  variants: Variant[],
): string | null {
  const total = variants.reduce((a, v) => a + Math.max(0, v.weight), 0)
  if (!variants.length || total <= 0) return null
  const x = bucket(experimentId, visitorKey) * total
  let acc = 0
  for (const v of variants) {
    acc += Math.max(0, v.weight)
    if (x < acc) return v.key
  }
  return variants[variants.length - 1]!.key
}
