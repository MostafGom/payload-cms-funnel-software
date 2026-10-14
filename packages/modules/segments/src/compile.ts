import type { SegmentCondition, SegmentGroup } from '@fp/contracts'

/**
 * Compiles the segment DSL (FR-CRM-6) to a parameterised SQL predicate over `cms.contacts c`.
 * Column names come from a closed map; every user value is a bind parameter, never inlined.
 */
const ATTRIBUTE_COLUMNS: Record<string, { sql: string; kind: 'text' | 'time' }> = {
  lifecycleStage: { sql: 'c.lifecycle_stage::text', kind: 'text' },
  marketingStatus: { sql: 'c.marketing_status::text', kind: 'text' },
  country: { sql: 'c.country', kind: 'text' },
  city: { sql: 'c.city', kind: 'text' },
  createdAt: { sql: 'c.created_at', kind: 'time' },
  email: { sql: 'c.email', kind: 'text' },
  phone: { sql: 'c.phone', kind: 'text' },
  'acquisition.utmSource': { sql: 'c.acquisition_utm_source', kind: 'text' },
  'acquisition.utmMedium': { sql: 'c.acquisition_utm_medium', kind: 'text' },
  'acquisition.utmCampaign': { sql: 'c.acquisition_utm_campaign', kind: 'text' },
  'acquisition.clickIdType': { sql: 'c.acquisition_click_id_type', kind: 'text' },
}

export interface CompiledSegment {
  where: string
  params: unknown[]
}

export function compileSegment(rules: SegmentGroup): CompiledSegment {
  const params: unknown[] = []
  const p = (v: unknown) => {
    params.push(v)
    return `$${params.length}`
  }

  const cond = (c: SegmentCondition): string => {
    switch (c.type) {
      case 'group': {
        const parts = c.conditions.map(cond)
        const joined = `(${parts.join(c.op === 'and' ? ' AND ' : ' OR ')})`
        return c.negate ? `NOT ${joined}` : joined
      }
      case 'attribute': {
        const col = ATTRIBUTE_COLUMNS[c.field]
        if (!col) throw new Error(`unknown attribute ${c.field}`)
        const v = c.value
        switch (c.operator) {
          case 'eq':
            return `${col.sql} = ${p(v)}`
          case 'neq':
            return `${col.sql} IS DISTINCT FROM ${p(v)}`
          case 'in':
            return `${col.sql} = ANY(${p(Array.isArray(v) ? v.map(String) : [String(v)])}::text[])`
          case 'not_in':
            return `(${col.sql} IS NULL OR NOT ${col.sql} = ANY(${p(Array.isArray(v) ? v.map(String) : [String(v)])}::text[]))`
          case 'contains':
            return `${col.sql} ILIKE '%' || ${p(String(v ?? '').replace(/[%_\\]/g, '\\$&'))} || '%'`
          case 'exists':
            return `(${col.sql} IS NOT NULL${col.kind === 'text' ? ` AND ${col.sql} <> ''` : ''})`
          case 'not_exists':
            return `(${col.sql} IS NULL${col.kind === 'text' ? ` OR ${col.sql} = ''` : ''})`
          case 'before':
            return `${col.sql} < ${p(String(v))}::timestamptz`
          case 'after':
            return `${col.sql} > ${p(String(v))}::timestamptz`
          case 'within_days':
            return `${col.sql} >= now() - make_interval(days => ${p(Number(v))}::int)`
        }
        throw new Error('unreachable')
      }
      case 'custom_field': {
        const key = p(c.key)
        const val = `(c.custom_fields ->> ${key})`
        switch (c.operator) {
          case 'eq':
            return `${val} = ${p(String(c.value))}`
          case 'neq':
            return `${val} IS DISTINCT FROM ${p(String(c.value))}`
          case 'contains':
            return `${val} ILIKE '%' || ${p(String(c.value ?? '').replace(/[%_\\]/g, '\\$&'))} || '%'`
          case 'exists':
            return `(c.custom_fields ? ${key})`
          case 'not_exists':
            return `NOT coalesce(c.custom_fields ? ${key}, false)`
          case 'gt':
          case 'lt': {
            // Guard the cast so non-numeric values simply do not match.
            const num = `CASE WHEN ${val} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN ${val}::numeric END`
            return `${num} ${c.operator === 'gt' ? '>' : '<'} ${p(Number(c.value))}::numeric`
          }
        }
        throw new Error('unreachable')
      }
      case 'tag':
      case 'list': {
        const path = c.type === 'tag' ? 'tags' : 'lists'
        const id = c.type === 'tag' ? c.tagId : c.listId
        const yes = c.type === 'tag' ? c.has : c.member
        const sub = `EXISTS (SELECT 1 FROM cms.contacts_rels r WHERE r.parent_id = c.id AND r.path = '${path}' AND r.${path}_id = ${p(id)}::uuid)`
        return yes ? sub : `NOT ${sub}`
      }
      case 'event': {
        const filters = [`e.contact_id = c.id`, `e.name = ${p(c.name)}`]
        if (c.withinDays)
          filters.push(`e.received_at >= now() - make_interval(days => ${p(c.withinDays)}::int)`)
        if (c.utmSource) filters.push(`e.utm_source = ${p(c.utmSource)}`)
        if (c.funnelId) filters.push(`e.funnel_id = ${p(c.funnelId)}`)
        const op = { gte: '>=', lte: '<=', eq: '=' }[c.count.operator]
        // `>= 1` is an EXISTS: much cheaper than counting.
        if (c.count.operator === 'gte' && c.count.value === 1)
          return `EXISTS (SELECT 1 FROM cdp.events e WHERE ${filters.join(' AND ')})`
        return `(SELECT count(*) FROM cdp.events e WHERE ${filters.join(' AND ')}) ${op} ${p(c.count.value)}`
      }
    }
  }

  return { where: cond(rules), params }
}

/** Full membership query; the worker runs it inside the diffing statement. */
export function membershipQuery(rules: SegmentGroup): CompiledSegment {
  const { where, params } = compileSegment(rules)
  return { where: `SELECT c.id FROM cms.contacts c WHERE c.status = 'active' AND ${where}`, params }
}
