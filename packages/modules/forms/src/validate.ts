import { z } from 'zod'
import type { FormFieldSnapshot, FormSnapshot } from '@fp/contracts'
import { normalizePhone } from '@fp/platform/crypto'

const TRUE_VALUES = new Set(['true', 'on', '1', 'yes'])
const toBool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : TRUE_VALUES.has(v.toLowerCase())))

const trimmed = (max: number) => z.string().trim().max(max)

function fieldSchema(f: FormFieldSnapshot, geoCountry?: string): z.ZodType {
  let s: z.ZodType
  switch (f.type) {
    case 'text': {
      let t = trimmed(f.maxLength ?? 256)
      if (f.minLength) t = t.min(f.minLength)
      s = t
      break
    }
    case 'textarea':
      s = trimmed(f.maxLength ?? 5000)
      break
    case 'email':
      s = z.string().trim().toLowerCase().pipe(z.email().max(254))
      break
    case 'phone':
      s = trimmed(32).refine(
        (v) => normalizePhone(v, (f.defaultCountry ?? geoCountry)?.toUpperCase() as never) !== null,
        'invalid phone number',
      )
      break
    case 'select': {
      const allowed = new Set(f.options.map((o) => o.value))
      const one = z.string().refine((v) => allowed.has(v), 'invalid option')
      s = f.multiple ? z.array(one).max(f.options.length) : one
      break
    }
    case 'checkbox':
    case 'consent':
      s = f.required ? toBool.refine((v) => v, 'required') : toBool.default(false)
      return s
    case 'hidden':
      s = trimmed(512)
      break
    case 'country':
      s = z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/, 'invalid country')
      break
  }
  if (f.required) {
    return f.type === 'select' && f.multiple
      ? (s as z.ZodArray<z.ZodString>).min(1, 'required')
      : (s as z.ZodString).refine((v: string) => v.length > 0, 'required')
  }
  // Optional: treat empty string as absent.
  return z.preprocess((v) => (v === '' ? undefined : v), s.optional())
}

/**
 * Server-side validator generated from the published form version (FR-FRM-4). Unknown keys are
 * stripped so a tampered client cannot inject fields that were never on the form.
 */
export function buildSubmissionSchema(
  form: Pick<FormSnapshot, 'fields'>,
  opts: { geoCountry?: string | null } = {},
) {
  const shape: Record<string, z.ZodType> = {}
  for (const f of form.fields) shape[f.name] = fieldSchema(f, opts.geoCountry ?? undefined)
  return z.object(shape).strip()
}

export type SubmissionValues = Record<string, string | string[] | boolean | undefined>

/** `geoCountry` lets visitors type national phone numbers (parsed with their country). */
export function validateSubmission(
  form: Pick<FormSnapshot, 'fields'>,
  values: unknown,
  opts: { geoCountry?: string | null } = {},
): { ok: true; values: SubmissionValues } | { ok: false; errors: Record<string, string> } {
  const r = buildSubmissionSchema(form, opts).safeParse(values)
  if (r.success) return { ok: true, values: r.data as SubmissionValues }
  const errors: Record<string, string> = {}
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? '_')
    errors[k] ??= i.message
  }
  return { ok: false, errors }
}
