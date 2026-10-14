/**
 * Contact dedupe decision (FR-FRM-6, FR-CRM-7): email first, then E.164 phone. A phone match that
 * belongs to a contact with a *different* email is never merged automatically; we create a new
 * contact and record a possible duplicate for manual review.
 */
export interface Candidate {
  id: string
  email: string | null
}

export type DedupeDecision =
  | { action: 'create'; possibleDuplicateOf?: string }
  | { action: 'update'; contactId: string; matchedOn: 'email' | 'phone' }

export function decideDedupe(input: {
  email: string | null
  byEmail: Candidate | null
  byPhone: Candidate | null
}): DedupeDecision {
  if (input.byEmail) return { action: 'update', contactId: input.byEmail.id, matchedOn: 'email' }
  if (input.byPhone) {
    const conflict = input.email && input.byPhone.email && input.byPhone.email !== input.email
    if (!conflict) return { action: 'update', contactId: input.byPhone.id, matchedOn: 'phone' }
    return { action: 'create', possibleDuplicateOf: input.byPhone.id }
  }
  return { action: 'create' }
}
