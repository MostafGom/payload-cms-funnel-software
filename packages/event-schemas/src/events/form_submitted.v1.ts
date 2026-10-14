import { z } from 'zod'

/** Never carries raw PII: the server-side copy is produced from the outbox with hashed identifiers. */
export const FormSubmittedV1 = z
  .object({
    form_id: z.string().max(64),
    submission_id: z.string().max(64).optional(),
  })
  .loose()
