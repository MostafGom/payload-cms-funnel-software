import { describe, expect, it } from 'vitest'
import type { EmailSequenceSnapshot } from '@fp/contracts'
import {
  createLinkToken,
  decideStep,
  dueAt,
  nextInWindow,
  renderEmail,
  verifyLinkToken,
} from './index.ts'

const SECRET = 'x'.repeat(32)

describe('FR-EML-4: signed links', () => {
  it('round-trips and rejects tampering, expiry and purpose confusion', () => {
    const t = createLinkToken(SECRET, 'unsub', 'c1', 60, 1_000_000)
    expect(verifyLinkToken(SECRET, 'unsub', t, 1_000_000)).toEqual({ ok: true, contactId: 'c1' })
    expect(verifyLinkToken(SECRET, 'unsub', t.replace('c1', 'c2'), 1_000_000)).toMatchObject({
      ok: false,
      reason: 'bad_signature',
    })
    expect(verifyLinkToken(SECRET, 'confirm', t, 1_000_000)).toMatchObject({
      ok: false,
      reason: 'wrong_purpose',
    })
    expect(verifyLinkToken(SECRET, 'unsub', t, 1_000_000 + 61_000)).toMatchObject({
      ok: false,
      reason: 'expired',
    })
    expect(verifyLinkToken(SECRET, 'unsub', 'junk', 0)).toMatchObject({
      ok: false,
      reason: 'malformed',
    })
  })
})

describe('FR-EML-1/4: rendering', () => {
  const t = {
    id: 't',
    name: 't',
    subject: 'Hi {{firstName}}',
    html: '<p>Hello {{firstName}}, <a href="{{confirmUrl}}">confirm</a></p>',
    text: 'Hello {{firstName}} {{confirmUrl}}',
  }
  it('escapes variables in HTML and adds one-click unsubscribe for marketing mail', () => {
    const r = renderEmail(
      t,
      { firstName: '<b>Ada</b>', confirmUrl: 'https://x/c?t=1&a=2' },
      { unsubscribeUrl: 'https://x/u?t=9', postalAddress: '1 Main St', marketing: true },
    )
    expect(r.subject).toBe('Hi <b>Ada</b>')
    expect(r.html).toContain('Hello &lt;b&gt;Ada&lt;/b&gt;')
    expect(r.html).toContain('href="https://x/c?t=1&amp;a=2"')
    expect(r.headers).toEqual({
      'List-Unsubscribe': '<https://x/u?t=9>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
    expect(r.text).toContain('Unsubscribe: https://x/u?t=9')
  })
  it('omits unsubscribe for transactional mail', () => {
    expect(renderEmail(t, {}, { marketing: false, unsubscribeUrl: 'u' }).headers).toEqual({})
  })
})

describe('FR-EML-2: scheduling', () => {
  const seq: EmailSequenceSnapshot = {
    id: 's',
    name: 's',
    active: true,
    trigger: { type: 'manual' },
    steps: [
      { delayAmount: 0, delayUnit: 'minutes', templateId: 't1' },
      { delayAmount: 2, delayUnit: 'days', templateId: 't2' },
      { delayAmount: 3, delayUnit: 'days', templateId: 't3' },
    ],
    window: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, timezone: 'Europe/Berlin' },
    exit: { tagIds: ['customer'], eventNames: [] },
  }
  it('defers sends into the window (weekend and night)', () => {
    // Saturday 2026-10-17 10:00 Berlin -> Monday 09:00 Berlin (07:00Z, CEST)
    expect(nextInWindow(new Date('2026-10-17T08:00:00Z'), seq.window).toISOString()).toBe(
      '2026-10-19T07:00:00.000Z',
    )
    // Tuesday 20:00 Berlin -> Wednesday 09:00
    expect(nextInWindow(new Date('2026-10-13T18:00:00Z'), seq.window).toISOString()).toBe(
      '2026-10-14T07:00:00.000Z',
    )
    // inside the window: unchanged
    expect(nextInWindow(new Date('2026-10-14T10:00:00Z'), seq.window).toISOString()).toBe(
      '2026-10-14T10:00:00.000Z',
    )
  })
  it('computes due times from the previous step', () => {
    expect(dueAt(seq, 1, new Date('2026-10-14T10:00:00Z'))!.toISOString()).toBe(
      '2026-10-16T10:00:00.000Z',
    )
    expect(dueAt(seq, 3, new Date())).toBeNull()
  })
  const contact = { marketingStatus: 'subscribed', status: 'active', tagIds: [], suppressed: false }
  it('sends, exits on exit conditions, completes after the last step', () => {
    const now = new Date('2026-10-14T10:00:00Z')
    expect(decideStep({ seq, currentStep: 0, now, contact, exitEventSeen: false })).toMatchObject({
      action: 'send',
      templateId: 't1',
    })
    expect(
      decideStep({
        seq,
        currentStep: 1,
        now,
        contact: { ...contact, tagIds: ['customer'] },
        exitEventSeen: false,
      }),
    ).toEqual({ action: 'exit', reason: 'exit_tag' })
    expect(
      decideStep({
        seq,
        currentStep: 1,
        now,
        contact: { ...contact, marketingStatus: 'unsubscribed' },
        exitEventSeen: false,
      }),
    ).toEqual({ action: 'exit', reason: 'not_subscribed' })
    expect(
      decideStep({
        seq,
        currentStep: 1,
        now,
        contact: { ...contact, suppressed: true },
        exitEventSeen: false,
      }),
    ).toEqual({ action: 'exit', reason: 'suppressed' })
    expect(decideStep({ seq, currentStep: 3, now, contact, exitEventSeen: false })).toEqual({
      action: 'complete',
    })
    // awaiting double opt-in: wait inside the grace period, exit after it
    const unconfirmed = { ...contact, marketingStatus: 'unconfirmed' }
    expect(
      decideStep({
        seq,
        currentStep: 0,
        now,
        contact: unconfirmed,
        exitEventSeen: false,
        enrolledAt: now,
      }),
    ).toMatchObject({ action: 'wait' })
    expect(
      decideStep({
        seq,
        currentStep: 0,
        now,
        contact: unconfirmed,
        exitEventSeen: false,
        enrolledAt: new Date(now.getTime() - 8 * 86_400_000),
      }),
    ).toEqual({ action: 'exit', reason: 'not_subscribed' })
  })
})
