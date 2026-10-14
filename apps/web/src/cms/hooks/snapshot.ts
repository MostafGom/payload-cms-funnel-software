import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'
import type { z } from 'zod'
import { writeSnapshot } from '@/lib/payload-tx'

/**
 * Publishes a validated config snapshot to `cdp.config_snapshots` in the same transaction as the
 * edit (ADR-0025). Drafts are ignored; only the published version reaches workers. The doc is
 * re-read with the server-only `rawSecrets` context so secret fields are not masked.
 */
export function snapshotHooks<S extends z.ZodType>(opts: {
  kind: string
  collection: CollectionSlug
  schema: S
  build: (doc: Record<string, unknown>, req: PayloadRequest) => Promise<z.input<S>> | z.input<S>
}): { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } {
  return {
    afterChange: async ({ doc, req }) => {
      if (doc._status === 'draft') return doc
      const raw = (await req.payload.findByID({
        collection: opts.collection,
        id: doc.id,
        depth: 0,
        draft: false,
        overrideAccess: true,
        req,
        context: { rawSecrets: true },
      })) as unknown as Record<string, unknown> | null
      const data = opts.schema.parse(await opts.build(raw ?? doc, req)) as Record<string, unknown>
      await writeSnapshot(req, { kind: opts.kind, id: String(doc.id), data })
      return doc
    },
    afterDelete: async ({ doc, req }) => {
      await writeSnapshot(req, { kind: opts.kind, id: String(doc.id), data: null })
      return doc
    },
  }
}

export function globalSnapshotHook<S extends z.ZodType>(opts: {
  kind: string
  slug: string
  schema: S
  build: (doc: Record<string, unknown>, req: PayloadRequest) => Promise<z.input<S>> | z.input<S>
}): GlobalAfterChangeHook {
  return async ({ doc, req }) => {
    const raw = (await req.payload.findGlobal({
      slug: opts.slug as never,
      depth: 0,
      overrideAccess: true,
      req,
      context: { rawSecrets: true },
    })) as unknown as Record<string, unknown> | null
    const data = opts.schema.parse(await opts.build(raw ?? doc, req)) as Record<string, unknown>
    await writeSnapshot(req, { kind: opts.kind, id: 'global', data })
    return doc
  }
}

/** Relationship value (id or populated doc) -> id string. */
export const relId = (v: unknown): string | undefined =>
  v == null ? undefined : typeof v === 'object' ? String((v as { id: unknown }).id) : String(v)

export const relIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(relId).filter((x): x is string => !!x) : []
