import { sql } from '@payloadcms/db-postgres'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { uuidv7 } from '@fp/platform/ids'
import { txExecute } from '@/lib/payload-tx'

/** Fields whose values never enter the audit log (only the fact that they changed). */
const MASKED = new Set([
  'email',
  'phone',
  'firstName',
  'lastName',
  'city',
  'customFields',
  'data',
  'password',
  'hash',
  'salt',
  'accessToken',
  'webhookSecret',
  'apiKey',
  'subjectEmail',
  'firstTouch',
  'lastTouch',
])
const IGNORED = new Set(['updatedAt', 'createdAt', 'id', '_status', 'emailHash', 'phoneHash'])

export function diff(prev: Record<string, unknown> | undefined, next: Record<string, unknown>) {
  const changes: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next)])
  for (const k of keys) {
    if (IGNORED.has(k)) continue
    const a = JSON.stringify(prev?.[k] ?? null)
    const b = JSON.stringify(next[k] ?? null)
    if (a === b) continue
    changes[k] = MASKED.has(k) ? '[changed]' : { from: prev?.[k] ?? null, to: next[k] ?? null }
  }
  return changes
}

/** Audit log of admin and CRM changes (Phase 2, ADR-0012), written in the same transaction. */
export function auditHooks(entity: string): {
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  const write = async (
    req: Parameters<CollectionAfterChangeHook>[0]['req'],
    action: string,
    id: string,
    changes: Record<string, unknown>,
  ) => {
    const actorType = req.user ? 'user' : 'system'
    await txExecute(
      req,
      sql`INSERT INTO cdp.audit_logs (id, actor_type, actor_id, action, entity, entity_id, changes)
          VALUES (${uuidv7()}, ${actorType}, ${req.user ? String(req.user.id) : ((req.context?.actor as string | undefined) ?? null)},
                  ${action}, ${entity}, ${id}, ${JSON.stringify(changes)}::jsonb)`,
    )
  }
  return {
    afterChange: async ({ doc, previousDoc, operation, req }) => {
      const changes = diff(operation === 'create' ? undefined : previousDoc, doc)
      if (Object.keys(changes).length) await write(req, operation, String(doc.id), changes)
      return doc
    },
    afterDelete: async ({ doc, req }) => {
      await write(req, 'delete', String(doc.id), {})
      return doc
    },
  }
}
