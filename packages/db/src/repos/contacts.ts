import type { Sql } from '../client.ts'

/**
 * Read model over Payload's `cms.contacts` for workers (ADR-0025). Only flat, stable columns are
 * read; `apps/web/src/lib/cms-read.int.test.ts` fails if Payload's layout changes underneath.
 * Workers never write `cms`; changes go through the CMS (web) instead.
 */
export interface ContactRow {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  country: string | null
  city: string | null
  email_hash: string | null
  phone_hash: string | null
  lifecycle_stage: string | null
  marketing_status: 'subscribed' | 'unconfirmed' | 'unsubscribed' | 'none'
  status: 'active' | 'erased' | 'merged'
  custom_fields: Record<string, unknown> | null
  created_at: string
  tag_ids: string[]
  list_ids: string[]
}

export async function getContacts(sql: Sql, ids: string[]): Promise<Map<string, ContactRow>> {
  const unique = [...new Set(ids)]
  if (!unique.length) return new Map()
  const rows = await sql<ContactRow[]>`
    SELECT c.id, c.email, c.phone, c.first_name, c.last_name, c.country, c.city, c.email_hash, c.phone_hash,
      c.lifecycle_stage::text AS lifecycle_stage, c.marketing_status::text AS marketing_status,
      c.status::text AS status, c.custom_fields, c.created_at,
      coalesce(array_agg(r.tags_id) FILTER (WHERE r.path = 'tags'), '{}') AS tag_ids,
      coalesce(array_agg(r.lists_id) FILTER (WHERE r.path = 'lists'), '{}') AS list_ids
    FROM cms.contacts c LEFT JOIN cms.contacts_rels r ON r.parent_id = c.id
    WHERE c.id = ANY(${unique}::uuid[])
    GROUP BY c.id`
  return new Map(rows.map((r) => [r.id, r]))
}

export async function getContact(sql: Sql, id: string): Promise<ContactRow | null> {
  return (await getContacts(sql, [id])).get(id) ?? null
}
