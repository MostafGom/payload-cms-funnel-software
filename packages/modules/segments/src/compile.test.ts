import { describe, expect, it } from 'vitest'
import { compileSegment, membershipQuery } from './index.ts'

describe('FR-CRM-6: segment compiler', () => {
  it('compiles nested groups to parameterised SQL', () => {
    const r = compileSegment({
      type: 'group',
      op: 'and',
      conditions: [
        { type: 'attribute', field: 'marketingStatus', operator: 'eq', value: 'subscribed' },
        { type: 'tag', tagId: '0199d5a4-0f6b-7c3e-9a2b-000000000001', has: true },
        {
          type: 'group',
          op: 'or',
          conditions: [
            {
              type: 'event',
              name: 'form_submitted',
              count: { operator: 'gte', value: 2 },
              withinDays: 30,
            },
            { type: 'custom_field', key: 'budget', operator: 'gt', value: 1000 },
          ],
        },
      ],
    })
    expect(r.where).toBe(
      "(c.marketing_status::text = $1 AND EXISTS (SELECT 1 FROM cms.contacts_rels r WHERE r.parent_id = c.id AND r.path = 'tags' AND r.tags_id = $2::uuid) AND ((SELECT count(*) FROM cdp.events e WHERE e.contact_id = c.id AND e.name = $3 AND e.received_at >= now() - make_interval(days => $4::int)) >= $5 OR CASE WHEN (c.custom_fields ->> $6) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (c.custom_fields ->> $6)::numeric END > $7::numeric))",
    )
    expect(r.params).toEqual([
      'subscribed',
      '0199d5a4-0f6b-7c3e-9a2b-000000000001',
      'form_submitted',
      30,
      2,
      'budget',
      1000,
    ])
  })

  it('never inlines user values (injection attempt stays a parameter)', () => {
    const evil = "x'); DROP TABLE cms.contacts; --"
    const r = compileSegment({
      type: 'group',
      op: 'and',
      conditions: [{ type: 'attribute', field: 'city', operator: 'contains', value: evil }],
    })
    expect(r.where).not.toContain('DROP')
    expect(r.params).toEqual([evil])
  })

  it('negation and existence', () => {
    const r = membershipQuery({
      type: 'group',
      op: 'or',
      negate: true,
      conditions: [
        { type: 'attribute', field: 'phone', operator: 'exists' },
        { type: 'list', listId: 'l', member: false },
      ],
    })
    expect(r.where).toContain("NOT ((c.phone IS NOT NULL AND c.phone <> '') OR NOT EXISTS")
    expect(
      r.where.startsWith("SELECT c.id FROM cms.contacts c WHERE c.status = 'active' AND "),
    ).toBe(true)
  })
})
