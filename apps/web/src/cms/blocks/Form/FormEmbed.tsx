'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { FormFieldSnapshot, FormSnapshot, SubmissionResponse } from '@fp/contracts'

type FpApi = {
  submissionMeta?: (formId: string) => Record<string, unknown>
  conversion?: (name: string, eventId: string, data?: Record<string, unknown>) => void
  track?: (name: string, props?: Record<string, unknown>) => void
}
declare global {
  interface Window {
    fp?: FpApi
    turnstile?: {
      render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void }) => void
    }
  }
}

const uuidv7 = (): string => {
  const b = crypto.getRandomValues(new Uint8Array(16))
  const ts = BigInt(Date.now())
  for (let i = 0; i < 6; i++) b[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn)
  b[6] = (b[6]! & 0x0f) | 0x70
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Accessible, progressive form (WCAG 2.2 AA, NFR-12). Tracking context comes from the SDK when
 * present; without it (blocked or no consent) the form still captures URL params (FR-FRM-8).
 */
export function FormEmbed({
  form,
  nextUrl,
  turnstileSiteKey,
}: {
  form: FormSnapshot
  nextUrl?: string
  turnstileSiteKey?: string
}) {
  const uid = useId()
  const startedAt = useRef(0)
  const started = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>()
  const turnstileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startedAt.current = Date.now()
    if (!turnstileSiteKey) return
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    s.async = true
    s.onload = () =>
      turnstileRef.current &&
      window.turnstile?.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: setTurnstileToken,
      })
    document.head.appendChild(s)
  }, [turnstileSiteKey])

  const onFocus = () => {
    if (started.current) return
    started.current = true
    window.fp?.track?.('form_started', { form_id: form.id })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrors({})
    const fd = new FormData(e.currentTarget)
    const values: Record<string, string | boolean | string[]> = {}
    const query = new URLSearchParams(window.location.search)
    for (const f of form.fields) {
      // Hidden fields read their URL param at submit time (FR-FRM-3), not at render.
      if (f.type === 'hidden')
        values[f.name] = (f.fromParam ? query.get(f.fromParam) : null) ?? f.defaultValue ?? ''
      else if (f.type === 'checkbox' || f.type === 'consent')
        values[f.name] = fd.get(f.name) === 'on'
      else if (f.type === 'select' && f.multiple) values[f.name] = fd.getAll(f.name).map(String)
      else values[f.name] = String(fd.get(f.name) ?? '')
    }
    const eventId = uuidv7()
    const sdkMeta = window.fp?.submissionMeta?.(form.id) ?? {}
    const meta = {
      sessionId: uuidv7(),
      pageUrl: window.location.href,
      referrer: document.referrer || undefined,
      ...sdkMeta,
      eventId,
      startedAt: startedAt.current,
      hp: String(fd.get('_hp') ?? ''),
      turnstileToken,
    }
    try {
      const res = await fetch(`/api/v1/forms/${encodeURIComponent(form.id)}/submissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ values, meta }),
      })
      const body = (await res.json()) as
        | SubmissionResponse
        | { error: string; errors?: Record<string, string> }
      if (!res.ok || !('ok' in body)) {
        const err = body as { error: string; errors?: Record<string, string> }
        setErrors(err.errors ?? {})
        setMessage(
          err.error === 'validation_failed'
            ? 'Please check the highlighted fields.'
            : 'Something went wrong. Please try again.',
        )
        setStatus('error')
        return
      }
      // Browser pixel conversion shares the server event id (FR-DST-4).
      window.fp?.conversion?.('form_submitted', body.eventId, { form_id: form.id })
      setStatus('done')
      const target = body.next.type === 'redirect' ? body.next.url : null
      const fallbackNext = form.onSuccess.type === 'next_step' ? nextUrl : null
      if (target || fallbackNext) {
        const url = new URL((target ?? fallbackNext)!, window.location.href)
        // Carry attribution params across steps.
        for (const [k, v] of new URLSearchParams(window.location.search))
          if (!url.searchParams.has(k)) url.searchParams.set(k, v)
        setTimeout(() => window.location.assign(url.toString()), 350)
      } else {
        setMessage(body.next.type === 'message' ? body.next.message : 'Thanks!')
      }
    } catch {
      setMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done' && message)
    return (
      <p className="form-success" role="status">
        {message}
      </p>
    )

  return (
    <form
      className="fp-form"
      noValidate
      onSubmit={onSubmit}
      onFocusCapture={onFocus}
      data-fp-form={form.id}
    >
      {form.fields.map((f) => (
        <Field key={f.name} field={f} id={`${uid}-${f.name}`} error={errors[f.name]} />
      ))}
      {/* Honeypot (FR-FRM-5): hidden from people and assistive tech. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Leave empty <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {turnstileSiteKey ? <div ref={turnstileRef} className="turnstile" /> : null}
      {message && status === 'error' ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <button
        className="button"
        type="submit"
        disabled={status === 'submitting'}
        aria-busy={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending…' : form.submitLabel}
      </button>
    </form>
  )
}

const AUTOCOMPLETE: Partial<Record<string, string>> = {
  email: 'email',
  phone: 'tel',
  firstName: 'given-name',
  lastName: 'family-name',
  country: 'country',
}

function Field({ field: f, id, error }: { field: FormFieldSnapshot; id: string; error?: string }) {
  const errId = `${id}-error`
  const common = {
    id,
    name: f.name,
    required: f.required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errId : undefined,
  }
  const label = (
    <label htmlFor={id}>
      {f.label}
      {f.required ? <span aria-hidden="true"> *</span> : null}
    </label>
  )
  const err = error ? (
    <span className="field-error" id={errId}>
      {error}
    </span>
  ) : null
  const cls = `field field--${f.type} field--${f.width}`
  switch (f.type) {
    case 'hidden':
      return null
    case 'textarea':
      return (
        <div className={cls}>
          {label}
          <textarea {...common} placeholder={f.placeholder} maxLength={f.maxLength} rows={4} />
          {err}
        </div>
      )
    case 'select':
      return (
        <div className={cls}>
          {label}
          <select {...common} multiple={f.multiple} defaultValue={f.multiple ? [] : ''}>
            {!f.multiple ? <option value="">{f.placeholder ?? 'Select…'}</option> : null}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {err}
        </div>
      )
    case 'checkbox':
    case 'consent':
      return (
        <div className={`${cls} field--check`}>
          <input type="checkbox" {...common} />
          {label}
          {err}
        </div>
      )
    default:
      return (
        <div className={cls}>
          {label}
          <input
            {...common}
            type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
            inputMode={f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : undefined}
            autoComplete={AUTOCOMPLETE[f.mapTo] ?? 'off'}
            placeholder={f.placeholder}
            maxLength={f.type === 'country' ? 2 : f.type === 'text' ? f.maxLength : undefined}
          />
          {err}
        </div>
      )
  }
}
