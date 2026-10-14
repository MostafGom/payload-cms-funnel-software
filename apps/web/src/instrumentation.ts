/**
 * Next.js instrumentation hook (ADR-0018). Next emits its own spans for routes and fetches once a
 * global tracer provider is registered; we only register it (Node runtime only).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startTelemetry } = await import('@fp/platform/otel')
  startTelemetry({
    service: 'web',
    version: process.env.APP_VERSION,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  })
}
