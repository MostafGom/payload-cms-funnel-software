import type { FormSnapshot } from '@fp/contracts'
import {
  normalizeCountry,
  normalizeEmail,
  normalizePhone,
  phoneForHashing,
  sha256Hex,
} from '@fp/platform/crypto'
import type { SubmissionValues } from './validate.ts'

export interface ContactPatch {
  email: string | null
  emailHash: string | null
  phone: string | null
  phoneHash: string | null
  firstName: string | null
  lastName: string | null
  /** ISO alpha-2 uppercase */
  country: string | null
  customFields: Record<string, unknown>
  /** consent checkboxes ticked on this form, by purpose */
  consents: Partial<Record<'email_marketing' | 'terms' | 'privacy' | 'sms_marketing', boolean>>
}

/** Applies each field's `mapTo` (FR-FRM-2) and normalizes identifiers for dedupe (FR-FRM-6). */
export function mapToContact(
  form: Pick<FormSnapshot, 'fields'>,
  values: SubmissionValues,
  opts: { geoCountry?: string | null } = {},
): ContactPatch {
  const patch: ContactPatch = {
    email: null,
    emailHash: null,
    phone: null,
    phoneHash: null,
    firstName: null,
    lastName: null,
    country: null,
    customFields: {},
    consents: {},
  }
  let phoneRaw: string | null = null
  let phoneCountry: string | undefined
  for (const f of form.fields) {
    const v = values[f.name]
    if (f.type === 'consent') patch.consents[f.purpose] = v === true
    if (v === undefined || v === '') continue
    const s = typeof v === 'string' ? v : null
    switch (f.mapTo) {
      case 'email':
        patch.email = normalizeEmail(s)
        break
      case 'phone':
        phoneRaw = s
        phoneCountry = f.type === 'phone' ? f.defaultCountry : undefined
        break
      case 'firstName':
        patch.firstName = s?.slice(0, 128) ?? null
        break
      case 'lastName':
        patch.lastName = s?.slice(0, 128) ?? null
        break
      case 'country':
        patch.country = normalizeCountry(s)?.toUpperCase() ?? null
        break
      case 'custom':
        patch.customFields[f.customKey ?? f.name] = v
        break
      case 'none':
        break
    }
  }
  const country = patch.country ?? opts.geoCountry?.toUpperCase() ?? phoneCountry?.toUpperCase()
  patch.phone = normalizePhone(phoneRaw, country as never)
  patch.emailHash = patch.email ? sha256Hex(patch.email) : null
  patch.phoneHash = patch.phone ? sha256Hex(phoneForHashing(patch.phone)) : null
  return patch
}
