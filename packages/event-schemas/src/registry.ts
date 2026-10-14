import type { z } from 'zod'
import type { EventEnvelope } from './envelope.ts'
import { FormSubmittedV1 } from './events/form_submitted.v1.ts'
import { PageViewedV1 } from './events/page_viewed.v1.ts'
import {
  ConsentUpdatedV1,
  CustomV1,
  ElementClickedV1,
  ExperimentExposedV1,
  FormAbandonedV1,
  FormStartedV1,
  ScrollDepthReachedV1,
  SegmentChangedV1,
} from './events/standard.v1.ts'

/**
 * Event schema registry (ADR-0008). To evolve an event:
 *  - additive optional field  -> edit the current version in place
 *  - breaking change          -> add `<name>.v<N+1>.ts`, register it, add an upcaster N -> N+1
 */
export interface EventDefinition {
  latest: number
  versions: Record<number, z.ZodType<Record<string, unknown>>>
  /** upcasters[n] converts properties from version n to n+1 */
  upcasters?: Record<number, (props: Record<string, unknown>) => Record<string, unknown>>
  /** conversion events fan out to destinations */
  conversion?: boolean
}

export const EVENT_REGISTRY = {
  page_viewed: { latest: 1, versions: { 1: PageViewedV1 } },
  element_clicked: { latest: 1, versions: { 1: ElementClickedV1 } },
  scroll_depth_reached: { latest: 1, versions: { 1: ScrollDepthReachedV1 } },
  form_started: { latest: 1, versions: { 1: FormStartedV1 } },
  form_abandoned: { latest: 1, versions: { 1: FormAbandonedV1 } },
  form_submitted: { latest: 1, versions: { 1: FormSubmittedV1 }, conversion: true },
  experiment_exposed: { latest: 1, versions: { 1: ExperimentExposedV1 } },
  consent_updated: { latest: 1, versions: { 1: ConsentUpdatedV1 } },
  segment_entered: { latest: 1, versions: { 1: SegmentChangedV1 } },
  segment_exited: { latest: 1, versions: { 1: SegmentChangedV1 } },
  custom: { latest: 1, versions: { 1: CustomV1 } },
} satisfies Record<string, EventDefinition>

export type CanonicalEventName = keyof typeof EVENT_REGISTRY

export const isCanonicalEvent = (name: string): name is CanonicalEventName =>
  Object.hasOwn(EVENT_REGISTRY, name)

export const isConversionEvent = (name: string): boolean =>
  isCanonicalEvent(name) &&
  'conversion' in EVENT_REGISTRY[name] &&
  EVENT_REGISTRY[name].conversion === true

export type NormalizeResult =
  | { ok: true; event: EventEnvelope }
  | { ok: false; reason: 'unknown_version' | 'invalid_properties'; issues?: unknown }

/**
 * Validates properties for the declared version, then upcasts to the latest version.
 * Unknown event names are preserved as `custom` with `properties.custom_name` (never dropped).
 */
export function normalizeEvent(event: EventEnvelope): NormalizeResult {
  if (!isCanonicalEvent(event.name)) {
    return normalizeEvent({
      ...event,
      name: 'custom',
      schema_v: 1,
      properties: { ...event.properties, custom_name: event.name },
    })
  }
  const def: EventDefinition = EVENT_REGISTRY[event.name]
  const schema = def.versions[event.schema_v]
  if (!schema) return { ok: false, reason: 'unknown_version' }

  const parsed = schema.safeParse(event.properties)
  if (!parsed.success)
    return { ok: false, reason: 'invalid_properties', issues: parsed.error.issues }

  let props = parsed.data
  for (let v = event.schema_v; v < def.latest; v++) {
    const up = def.upcasters?.[v]
    if (!up) return { ok: false, reason: 'unknown_version' }
    props = up(props)
  }
  return { ok: true, event: { ...event, schema_v: def.latest, properties: props } }
}
