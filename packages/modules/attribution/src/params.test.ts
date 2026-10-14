import { describe, expect, it } from 'vitest'
import { extractAttribution } from './params.ts'

describe('FR-FRM-3: attribution parameter capture', () => {
  it('captures utm, click ids and every custom param', () => {
    const a = extractAttribution(
      'https://go.brand.com/offer?utm_source=fb&UTM_Campaign=fall&fbclid=F1&ttclid=T1&ScCid=S1&gclid=G1&aff=42&sub1=x',
    )
    expect(a.utm).toEqual({ utm_source: 'fb', utm_campaign: 'fall' })
    expect(a.clickIds).toEqual({ fbclid: 'F1', ttclid: 'T1', ScCid: 'S1', gclid: 'G1' })
    expect(a.params).toMatchObject({ aff: '42', sub1: 'x', fbclid: 'F1', UTM_Campaign: 'fall' })
  })

  it('accepts lowercased Snapchat click id and normalizes its key', () => {
    expect(extractAttribution('https://x.com/?sccid=abc').clickIds).toEqual({ ScCid: 'abc' })
  })

  it('never stores denylisted PII params', () => {
    const a = extractAttribution('https://x.com/?email=a@b.com&token=t&utm_source=x', [
      'promo_secret',
    ])
    expect(a.params).toEqual({ utm_source: 'x' })
    expect(extractAttribution('https://x.com/?promo_secret=1', ['promo_secret']).params).toEqual({})
  })

  it('bounds value length, keeps first duplicate and survives bad urls', () => {
    const a = extractAttribution(`https://x.com/?a=1&a=2&b=${'z'.repeat(600)}`)
    expect(a.params.a).toBe('1')
    expect(a.params.b).toHaveLength(512)
    expect(extractAttribution('not a url')).toEqual({ utm: {}, clickIds: {}, params: {} })
  })
})
