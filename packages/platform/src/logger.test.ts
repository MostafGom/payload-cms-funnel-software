import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createLogger } from './logger.ts'

describe('NFR-10: logs never contain PII', () => {
  it('redacts known PII keys at top level and one level deep', () => {
    let out = ''
    const sink = new Writable({
      write(chunk, _enc, cb) {
        out += chunk.toString()
        cb()
      },
    })
    const log = createLogger({ service: 'test', destination: sink })
    log.info(
      { email: 'jane@example.com', contact: { phone: '+14155552671', ip: '203.0.113.7' } },
      'submitted',
    )
    expect(out).not.toContain('jane@example.com')
    expect(out).not.toContain('+14155552671')
    expect(out).not.toContain('203.0.113.7')
    expect(out).toContain('[redacted]')
  })
})
