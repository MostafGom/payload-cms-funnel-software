import { z } from 'zod'

/**
 * Segment rule DSL (FR-CRM-6). Stored as JSON on the segment, compiled to parameterised SQL by
 * @fp/segments. Attribute names are a closed set mapped to known columns; nothing is interpolated.
 */
export const SEGMENT_ATTRIBUTES = [
  'lifecycleStage',
  'marketingStatus',
  'country',
  'city',
  'createdAt',
  'email',
  'phone',
  'acquisition.utmSource',
  'acquisition.utmMedium',
  'acquisition.utmCampaign',
  'acquisition.clickIdType',
] as const

const scalar = z.union([z.string().max(512), z.number(), z.boolean()])

export const AttributeCondition = z.object({
  type: z.literal('attribute'),
  field: z.enum(SEGMENT_ATTRIBUTES),
  operator: z.enum([
    'eq',
    'neq',
    'in',
    'not_in',
    'contains',
    'exists',
    'not_exists',
    'before',
    'after',
    'within_days',
  ]),
  value: z.union([scalar, z.array(scalar).max(500)]).optional(),
})

export const CustomFieldCondition = z.object({
  type: z.literal('custom_field'),
  key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  operator: z.enum(['eq', 'neq', 'contains', 'exists', 'not_exists', 'gt', 'lt']),
  value: scalar.optional(),
})

export const TagCondition = z.object({
  type: z.literal('tag'),
  tagId: z.string(),
  has: z.boolean().default(true),
})
export const ListCondition = z.object({
  type: z.literal('list'),
  listId: z.string(),
  member: z.boolean().default(true),
})

export const EventCondition = z.object({
  type: z.literal('event'),
  name: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  count: z
    .object({ operator: z.enum(['gte', 'lte', 'eq']), value: z.number().int().min(0) })
    .default({ operator: 'gte', value: 1 }),
  withinDays: z.number().int().min(1).max(3650).optional(),
  utmSource: z.string().max(256).optional(),
  funnelId: z.string().max(64).optional(),
})

export type SegmentCondition =
  | z.infer<typeof AttributeCondition>
  | z.infer<typeof CustomFieldCondition>
  | z.infer<typeof TagCondition>
  | z.infer<typeof ListCondition>
  | z.infer<typeof EventCondition>
  | SegmentGroup
export interface SegmentGroup {
  type: 'group'
  op: 'and' | 'or'
  negate?: boolean
  conditions: SegmentCondition[]
}

export const SegmentCondition: z.ZodType<SegmentCondition> = z.lazy(() =>
  z.union([
    AttributeCondition,
    CustomFieldCondition,
    TagCondition,
    ListCondition,
    EventCondition,
    SegmentGroupSchema,
  ]),
)
export const SegmentGroupSchema: z.ZodType<SegmentGroup> = z.lazy(() =>
  z.object({
    type: z.literal('group'),
    op: z.enum(['and', 'or']),
    negate: z.boolean().optional(),
    conditions: z.array(SegmentCondition).min(1).max(50),
  }),
)

export const SegmentSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  rules: SegmentGroupSchema,
  recomputeMinutes: z.number().int().min(5).default(60),
})
export type SegmentSnapshot = z.infer<typeof SegmentSnapshot>
