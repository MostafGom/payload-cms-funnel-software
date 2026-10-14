import type { CollectionConfig } from 'payload'
import { SegmentGroupSchema, SegmentSnapshot } from '@fp/contracts'
import { canEditCrm, isAuthenticated } from '../access/roles'
import { auditHooks } from '../hooks/audit'
import { snapshotHooks } from '../hooks/snapshot'

const snapshot = snapshotHooks({
  kind: 'segment',
  collection: 'segments',
  schema: SegmentSnapshot,
  build: (doc) => ({
    id: String(doc.id),
    name: String(doc.name),
    rules: doc.rules as never,
    recomputeMinutes: (doc.recomputeMinutes as number) ?? 60,
  }),
})

/** Rule-based segments with enter/exit events (FR-CRM-6). Membership is computed by the worker. */
export const Segments: CollectionConfig = {
  slug: 'segments',
  admin: {
    useAsTitle: 'name',
    group: 'CRM',
    defaultColumns: ['name', 'recomputeMinutes', 'updatedAt'],
  },
  access: { read: isAuthenticated, create: canEditCrm, update: canEditCrm, delete: canEditCrm },
  hooks: {
    afterChange: [snapshot.afterChange, auditHooks('segments').afterChange],
    afterDelete: [snapshot.afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'rules',
      type: 'json',
      required: true,
      defaultValue: {
        type: 'group',
        op: 'and',
        conditions: [
          { type: 'attribute', field: 'marketingStatus', operator: 'eq', value: 'subscribed' },
        ],
      },
      admin: {
        description:
          'Rule DSL: groups (and/or) of attribute, custom_field, tag, list and event conditions.',
      },
      validate: (v: unknown) => {
        const r = SegmentGroupSchema.safeParse(v)
        return (
          r.success || r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        )
      },
    },
    { name: 'recomputeMinutes', type: 'number', defaultValue: 60, min: 5 },
    // Membership lives in cdp (computed by the worker); shown live, never copied into the CMS.
    {
      name: 'stats',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/cms/components/SegmentStats#SegmentStats' },
      },
    },
  ],
}
