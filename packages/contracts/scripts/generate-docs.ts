// Generates docs/api/openapi.json and docs/event-catalog.md from the Zod contracts (ADR-0008, ADR-0021).
// Run: pnpm docs:generate. CI fails if the committed files are stale (docs.test.ts).
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { EVENT_REGISTRY, EventBatch, EventEnvelope } from '@fp/event-schemas'
import { SubmissionRequest, SubmissionResponse } from '../src/index.ts'

const root = new URL('../../../', import.meta.url)
const schema = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' })

export function openapi() {
  const error = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      errors: { type: 'object', additionalProperties: { type: 'string' } },
    },
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Funnel Platform public API',
      version: '1.0.0',
      description: 'Same-origin endpoints used by funnel pages. Admin APIs are internal.',
    },
    paths: {
      '/api/v1/forms/{formId}/submissions': {
        post: {
          summary: 'Submit a form (FR-FRM-3..8)',
          parameters: [{ name: 'formId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: schema(SubmissionRequest) } },
          },
          responses: {
            200: {
              description: 'Accepted (also returned to suspected bots)',
              content: { 'application/json': { schema: schema(SubmissionResponse) } },
            },
            400: {
              description: 'Malformed request',
              content: { 'application/json': { schema: error } },
            },
            403: {
              description: 'Cross-origin request',
              content: { 'application/json': { schema: error } },
            },
            404: { description: 'Form not published' },
            422: {
              description: 'Validation failed (per-field errors)',
              content: { 'application/json': { schema: error } },
            },
            429: { description: 'Rate limited' },
            503: { description: 'Temporarily unavailable; retry' },
          },
        },
      },
      '/_t/e': {
        post: {
          summary:
            'Collect a batch of tracking events (FR-TRK-2). Body is JSON sent as text/plain.',
          requestBody: {
            required: true,
            content: { 'text/plain': { schema: schema(EventBatch) } },
          },
          responses: {
            204: { description: 'All accepted' },
            202: { description: 'Some events rejected' },
            400: { description: 'Invalid batch' },
            403: { description: 'Unknown site key' },
            413: { description: 'Body over 64 KB' },
            429: { description: 'Rate limited' },
            503: { description: 'Buffer unavailable; SDK retries' },
          },
        },
      },
      '/api/v1/email/unsubscribe': {
        get: {
          summary: 'Unsubscribe confirmation page',
          parameters: [{ name: 't', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'HTML page' } },
        },
        post: {
          summary: 'RFC 8058 one-click unsubscribe',
          parameters: [{ name: 't', in: 'query', schema: { type: 'string' } }],
          responses: { 200: { description: 'Unsubscribed' } },
        },
      },
      '/api/v1/email/confirm': {
        get: {
          summary: 'Double opt-in confirmation',
          parameters: [{ name: 't', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Confirmed' } },
        },
      },
    },
    components: { schemas: { EventEnvelope: schema(EventEnvelope) } },
  }
}

export function eventCatalog(): string {
  const lines = [
    '# Event catalog',
    '',
    'Generated from `@fp/event-schemas` (ADR-0008). Do not edit by hand: run `pnpm docs:generate`.',
    '',
    '| Event | Version | Conversion | Properties |',
    '| --- | --- | --- | --- |',
  ]
  for (const [name, def] of Object.entries(EVENT_REGISTRY)) {
    const s = z.toJSONSchema(def.versions[def.latest as 1] as z.ZodType, {
      unrepresentable: 'any',
    }) as { properties?: Record<string, { type?: string }>; required?: string[] }
    const props =
      Object.entries(s.properties ?? {})
        .map(([k, v]) => `\`${k}\`${s.required?.includes(k) ? '' : '?'}: ${v.type ?? 'any'}`)
        .join(', ') || '(none)'
    lines.push(
      `| \`${name}\` | v${def.latest} | ${'conversion' in def && def.conversion ? 'yes' : ''} | ${props} |`,
    )
  }
  return lines.join('\n') + '\n'
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  writeFileSync(new URL('docs/api/openapi.json', root), JSON.stringify(openapi(), null, 2) + '\n')
  writeFileSync(new URL('docs/event-catalog.md', root), eventCatalog())
  console.log('docs generated')
}
