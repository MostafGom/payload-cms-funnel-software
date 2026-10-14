import { z } from 'zod'

export const ElementClickedV1 = z
  .object({
    selector: z.string().max(512).optional(),
    text: z.string().max(256).optional(),
    href: z.string().max(2048).optional(),
  })
  .loose()

export const ScrollDepthReachedV1 = z.object({ depth: z.number().int().min(0).max(100) }).loose()

export const FormStartedV1 = z.object({ form_id: z.string().max(64) }).loose()

export const FormAbandonedV1 = z
  .object({ form_id: z.string().max(64), last_field: z.string().max(128).optional() })
  .loose()

export const ExperimentExposedV1 = z
  .object({ experiment_id: z.string().max(64), variant_key: z.string().max(64) })
  .loose()

export const ConsentUpdatedV1 = z.object({ analytics: z.boolean(), marketing: z.boolean() }).loose()

export const CustomV1 = z.object({ custom_name: z.string().max(128) }).loose()

export const SegmentChangedV1 = z.object({ segment_id: z.string().max(64) }).loose()
