import { describe, expect, it } from 'vitest'
import type { FormSnapshot } from '@fp/contracts'
import { sha256Hex } from '@fp/platform/crypto'
import { checkSpam, decideDedupe, mapToContact, validateSubmission } from './index.ts'

const form: Pick<FormSnapshot, 'fields'> = {
  fields: [
    {
      type: 'text',
      name: 'first_name',
      label: 'First',
      required: true,
      mapTo: 'firstName',
      width: 'half',
    },
    { type: 'email', name: 'email', label: 'Email', required: true, mapTo: 'email', width: 'full' },
    {
      type: 'phone',
      name: 'phone',
      label: 'Phone',
      required: false,
      mapTo: 'phone',
      width: 'full',
      defaultCountry: 'US',
    },
    {
      type: 'select',
      name: 'goal',
      label: 'Goal',
      required: false,
      mapTo: 'custom',
      customKey: 'goal',
      width: 'full',
      multiple: false,
      options: [
        { label: 'Grow', value: 'grow' },
        { label: 'Save', value: 'save' },
      ],
    },
    {
      type: 'consent',
      name: 'optin',
      label: 'Email me',
      required: false,
      mapTo: 'none',
      width: 'full',
      purpose: 'email_marketing',
    },
    {
      type: 'consent',
      name: 'terms',
      label: 'Terms',
      required: true,
      mapTo: 'none',
      width: 'full',
      purpose: 'terms',
    },
    {
      type: 'hidden',
      name: 'promo',
      label: 'Promo',
      required: false,
      mapTo: 'custom',
      width: 'full',
    },
    {
      type: 'country',
      name: 'country',
      label: 'Country',
      required: false,
      mapTo: 'country',
      width: 'full',
    },
  ],
}

describe('FR-FRM-4: server-side validation from the published form', () => {
  it('accepts valid values, normalizes and strips unknown keys', () => {
    const r = validateSubmission(form, {
      first_name: ' Ada ',
      email: ' Ada@Example.COM ',
      phone: '(415) 555-0123',
      goal: 'grow',
      optin: 'on',
      terms: true,
      injected: 'x',
      country: 'gb',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.values).toMatchObject({
      first_name: 'Ada',
      email: 'ada@example.com',
      optin: true,
      country: 'GB',
    })
    expect(r.values).not.toHaveProperty('injected')
  })

  it('reports per-field errors', () => {
    const r = validateSubmission(form, {
      first_name: '',
      email: 'nope',
      phone: '12',
      goal: 'other',
      terms: false,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['email', 'first_name', 'goal', 'phone', 'terms'])
  })

  it('treats empty optional fields as absent', () => {
    const r = validateSubmission(form, {
      first_name: 'A',
      email: 'a@b.co',
      phone: '',
      terms: 'true',
    })
    expect(r.ok).toBe(true)
  })
})

describe('FR-FRM-2/6: mapping to contact fields', () => {
  it('maps fields, normalizes identifiers and hashes them', () => {
    const r = validateSubmission(form, {
      first_name: 'Ada',
      email: 'ADA@example.com',
      phone: '415 555 0123',
      goal: 'save',
      optin: true,
      terms: true,
      promo: 'SPRING',
    })
    if (!r.ok) throw new Error('invalid')
    const c = mapToContact(form, r.values)
    expect(c).toMatchObject({
      email: 'ada@example.com',
      phone: '+14155550123',
      firstName: 'Ada',
      customFields: { goal: 'save', promo: 'SPRING' },
      consents: { email_marketing: true, terms: true },
    })
    expect(c.emailHash).toBe(sha256Hex('ada@example.com'))
    expect(c.phoneHash).toBe(sha256Hex('14155550123'))
  })

  it('uses geo country to parse national phone numbers', () => {
    const f: Pick<FormSnapshot, 'fields'> = {
      fields: [
        { type: 'text', name: 'tel', label: 'Tel', required: false, mapTo: 'phone', width: 'full' },
      ],
    }
    expect(mapToContact(f, { tel: '030 12345678' }, { geoCountry: 'de' }).phone).toBe(
      '+493012345678',
    )
  })
})

describe('FR-FRM-5: spam signals', () => {
  const base = { startedAt: 1_000, now: 10_000, minSeconds: 2, blockDisposable: true }
  it.each([
    [{ honeypot: 'bot' }, 'honeypot'],
    [{ now: 1_500 }, 'too_fast'],
    [{ email: 'x@mailinator.com' }, 'disposable_email'],
    [{ now: 1_000 + 25 * 3600 * 1000 }, 'stale'],
  ])('%j -> %s', (over, reason) => {
    expect(checkSpam({ ...base, ...over })).toEqual({ ok: false, reason })
  })
  it('passes a normal human', () => {
    expect(checkSpam({ ...base, email: 'ada@example.com', honeypot: '' })).toEqual({ ok: true })
  })
})

describe('FR-FRM-6 / FR-CRM-7: dedupe', () => {
  it('matches on email first', () => {
    expect(
      decideDedupe({
        email: 'a@x.co',
        byEmail: { id: '1', email: 'a@x.co' },
        byPhone: { id: '2', email: null },
      }),
    ).toEqual({ action: 'update', contactId: '1', matchedOn: 'email' })
  })
  it('falls back to phone when the phone contact has no conflicting email', () => {
    expect(
      decideDedupe({ email: 'a@x.co', byEmail: null, byPhone: { id: '2', email: null } }),
    ).toEqual({ action: 'update', contactId: '2', matchedOn: 'phone' })
  })
  it('never merges on conflict; flags a possible duplicate', () => {
    expect(
      decideDedupe({ email: 'a@x.co', byEmail: null, byPhone: { id: '2', email: 'b@x.co' } }),
    ).toEqual({ action: 'create', possibleDuplicateOf: '2' })
  })
})

describe('FR-FRM-4: national phone numbers use the visitor geo', () => {
  it('accepts a US national number from a US visitor', () => {
    const f: Pick<FormSnapshot, 'fields'> = {
      fields: [
        { type: 'phone', name: 'p', label: 'P', required: true, mapTo: 'phone', width: 'full' },
      ],
    }
    expect(validateSubmission(f, { p: '(415) 555-0123' }).ok).toBe(false)
    expect(validateSubmission(f, { p: '(415) 555-0123' }, { geoCountry: 'US' }).ok).toBe(true)
  })
})
