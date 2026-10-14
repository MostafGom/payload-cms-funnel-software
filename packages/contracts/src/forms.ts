import { z } from 'zod'

/** Field keys become JSON keys and HTML names: keep them boring. */
export const FIELD_NAME = /^[a-z][a-z0-9_]{0,63}$/

/** Contact attributes a field can map to (FR-FRM-2). `custom` writes contact.customFields[customKey]. */
export const CONTACT_FIELD_TARGETS = [
  'email',
  'phone',
  'firstName',
  'lastName',
  'country',
  'custom',
  'none',
] as const
export type ContactFieldTarget = (typeof CONTACT_FIELD_TARGETS)[number]

const base = {
  name: z.string().regex(FIELD_NAME),
  label: z.string().max(256),
  required: z.boolean().default(false),
  mapTo: z.enum(CONTACT_FIELD_TARGETS).default('none'),
  customKey: z.string().regex(FIELD_NAME).optional(),
  placeholder: z.string().max(256).optional(),
  width: z.enum(['full', 'half']).default('full'),
}

export const FormFieldSnapshot = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('text'),
    minLength: z.number().int().optional(),
    maxLength: z.number().int().optional(),
  }),
  z.object({ ...base, type: z.literal('textarea'), maxLength: z.number().int().optional() }),
  z.object({ ...base, type: z.literal('email') }),
  z.object({ ...base, type: z.literal('phone'), defaultCountry: z.string().length(2).optional() }),
  z.object({
    ...base,
    type: z.literal('select'),
    multiple: z.boolean().default(false),
    options: z.array(z.object({ label: z.string(), value: z.string().max(256) })).min(1),
  }),
  z.object({ ...base, type: z.literal('checkbox') }),
  z.object({
    ...base,
    type: z.literal('consent'),
    /** what the visitor agrees to; email_marketing drives the contact's subscription status */
    purpose: z.enum(['email_marketing', 'terms', 'privacy', 'sms_marketing']),
  }),
  z.object({
    ...base,
    type: z.literal('hidden'),
    defaultValue: z.string().max(512).optional(),
    /** fill from this URL parameter when present */
    fromParam: z.string().max(128).optional(),
  }),
  z.object({ ...base, type: z.literal('country') }),
])
export type FormFieldSnapshot = z.infer<typeof FormFieldSnapshot>
export type FormFieldType = FormFieldSnapshot['type']

export const FormSnapshot = z.object({
  id: z.string(),
  name: z.string(),
  /** bumps on every publish; stored on each submission */
  version: z.string(),
  fields: z.array(FormFieldSnapshot).min(1),
  submitLabel: z.string().default('Submit'),
  onSuccess: z.object({
    type: z.enum(['next_step', 'redirect', 'message']),
    redirectUrl: z.string().max(2048).optional(),
    message: z.string().max(2000).optional(),
  }),
  actions: z.object({
    tagIds: z.array(z.string()).default([]),
    listIds: z.array(z.string()).default([]),
    lifecycleStage: z.string().optional(),
    doubleOptIn: z.boolean().default(false),
    confirmationTemplateId: z.string().optional(),
    sequenceIds: z.array(z.string()).default([]),
  }),
  spam: z.object({
    minSeconds: z.number().min(0).default(2),
    turnstile: z.boolean().default(false),
    blockDisposable: z.boolean().default(true),
  }),
})
export type FormSnapshot = z.infer<typeof FormSnapshot>
