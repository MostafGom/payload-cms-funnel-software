/**
 * Read model of a CMS contact for workers (ADR-0025). Mirrors flat columns of `cms.contacts`;
 * `apps/web` has an integration test that fails if those columns change.
 */
export interface ContactView {
  id: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  country: string | null
  city: string | null
  emailHash: string | null
  phoneHash: string | null
  lifecycleStage: string | null
  marketingStatus: 'subscribed' | 'unconfirmed' | 'unsubscribed' | 'none'
  status: 'active' | 'erased' | 'merged'
  tagIds: string[]
  listIds: string[]
  customFields: Record<string, unknown>
  createdAt: string
}

export const LIFECYCLE_STAGES = [
  'subscriber',
  'lead',
  'marketing_qualified',
  'sales_qualified',
  'opportunity',
  'customer',
  'evangelist',
  'other',
] as const
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]
