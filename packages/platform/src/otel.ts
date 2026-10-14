import {
  context,
  metrics,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Context,
  type Link,
  type Meter,
  type Span,
  type Tracer,
} from '@opentelemetry/api'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

/**
 * OpenTelemetry bootstrap (ADR-0018). Spans are created explicitly at the boundaries that matter
 * (HTTP entry, stream hand-off, outbound calls) rather than via monkey-patching auto-instrumentation,
 * which is unreliable under native ESM. Without an endpoint the API stays a no-op.
 */
export interface TelemetryOptions {
  service: string
  version?: string
  /** OTLP/HTTP base URL, e.g. http://lgtm:4318. Empty disables export. */
  endpoint?: string
  metricIntervalMs?: number
}

export interface Telemetry {
  tracer: Tracer
  meter: Meter
  shutdown(): Promise<void>
}

export function startTelemetry(o: TelemetryOptions): Telemetry {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: o.service,
    [ATTR_SERVICE_VERSION]: o.version ?? '0.0.0',
  })
  const base = o.endpoint?.replace(/\/$/, '')
  // Always register a provider: it installs the async context manager and W3C propagator, so trace
  // ids still flow (and appear in logs) when export is disabled.
  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: base
      ? [
          new BatchSpanProcessor(new OTLPTraceExporter({ url: `${base}/v1/traces` }), {
            maxQueueSize: 4096,
          }),
        ]
      : [],
  })
  tracerProvider.register({ propagator: new W3CTraceContextPropagator() })
  if (!base) {
    return {
      tracer: trace.getTracer(o.service),
      meter: metrics.getMeter(o.service),
      shutdown: () => tracerProvider.shutdown(),
    }
  }
  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${base}/v1/metrics` }),
        exportIntervalMillis: o.metricIntervalMs ?? 15_000,
      }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)
  return {
    tracer: trace.getTracer(o.service),
    meter: metrics.getMeter(o.service),
    async shutdown() {
      await Promise.allSettled([tracerProvider.shutdown(), meterProvider.shutdown()])
    },
  }
}

/** Parent context from a W3C `traceparent` string (header or stream field). */
export function contextFromTraceparent(traceparent: string | undefined | null): Context {
  if (!traceparent) return ROOT_CONTEXT
  return propagation.extract(ROOT_CONTEXT, { traceparent })
}

/** `traceparent` for the active span, to carry across a queue or stream hop. */
export function currentTraceparent(ctx: Context = context.active()): string | undefined {
  const carrier: Record<string, string> = {}
  propagation.inject(ctx, carrier)
  return carrier.traceparent
}

/** Span links for a batch consumer: one link per producer trace (capped; OTel default limit 128). */
export function linksFromTraceparents(traceparents: (string | undefined)[], max = 128): Link[] {
  const links: Link[] = []
  for (const tp of traceparents) {
    if (links.length >= max) break
    const sc = trace.getSpanContext(contextFromTraceparent(tp))
    if (sc) links.push({ context: sc })
  }
  return links
}

/** Runs `fn` in a span, recording exceptions and status. */
export async function withSpan<T>(
  tracer: Tracer,
  name: string,
  opts: {
    kind?: SpanKind
    parent?: Context
    links?: Link[]
    attributes?: Record<string, string | number | boolean>
  },
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    { kind: opts.kind ?? SpanKind.INTERNAL, links: opts.links, attributes: opts.attributes },
    opts.parent ?? context.active(),
    async (span) => {
      try {
        return await fn(span)
      } catch (err) {
        span.recordException(err as Error)
        span.setStatus({ code: SpanStatusCode.ERROR })
        throw err
      } finally {
        span.end()
      }
    },
  )
}

export { context, metrics, SpanKind, SpanStatusCode, trace, type Meter, type Span, type Tracer }
