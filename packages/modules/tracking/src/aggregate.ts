import { isConversionEvent } from '@fp/event-schemas'

/** The subset of a stored event the read models need. */
export interface TrackedEvent {
  workspaceId: number
  eventId: string
  name: string
  occurredAt: string
  sessionId: string
  anonymousId: string | null
  contactId: string | null
  funnelId: string | null
  stepId: string | null
  variantKey: string | null
  experimentId?: string | null
  pageUrl: string | null
  pagePath: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  clickIds: Record<string, string> | null
  deviceType: string | null
  os: string | null
  browser: string | null
  geoCountry: string | null
  isBot: boolean
}

export interface SessionDelta {
  workspaceId: number
  sessionId: string
  anonymousId: string | null
  contactId: string | null
  startedAt: string
  lastSeenAt: string
  eventCount: number
  pageviews: number
  landingUrl: string | null
  landingPath: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  clickIds: Record<string, string> | null
  deviceType: string | null
  os: string | null
  browser: string | null
  geoCountry: string | null
  isBot: boolean
  converted: boolean
}

const byTime = (a: TrackedEvent, b: TrackedEvent) => a.occurredAt.localeCompare(b.occurredAt)

/**
 * Folds a batch of events into one delta per session (FR-TRK-4). The repository merges deltas
 * into existing rows (counts add, first-touch fields are kept, timestamps widen).
 */
export function sessionDeltas(events: TrackedEvent[]): SessionDelta[] {
  const groups = new Map<string, TrackedEvent[]>()
  for (const e of events) {
    const g = groups.get(e.sessionId)
    if (g) g.push(e)
    else groups.set(e.sessionId, [e])
  }
  return [...groups.values()].map((g) => {
    g.sort(byTime)
    const first = g[0]!
    const last = g[g.length - 1]!
    const landing = g.find((e) => e.name === 'page_viewed') ?? first
    return {
      workspaceId: first.workspaceId,
      sessionId: first.sessionId,
      anonymousId: g.find((e) => e.anonymousId)?.anonymousId ?? null,
      contactId: g.find((e) => e.contactId)?.contactId ?? null,
      startedAt: first.occurredAt,
      lastSeenAt: last.occurredAt,
      eventCount: g.length,
      pageviews: g.filter((e) => e.name === 'page_viewed').length,
      landingUrl: landing.pageUrl,
      landingPath: landing.pagePath,
      referrer: landing.referrer,
      utmSource: landing.utmSource,
      utmMedium: landing.utmMedium,
      utmCampaign: landing.utmCampaign,
      utmTerm: landing.utmTerm,
      utmContent: landing.utmContent,
      clickIds: landing.clickIds,
      deviceType: first.deviceType,
      os: first.os,
      browser: first.browser,
      geoCountry: first.geoCountry,
      isBot: g.some((e) => e.isBot),
      converted: g.some((e) => isConversionEvent(e.name)),
    }
  })
}

export interface JourneyDelta {
  workspaceId: number
  funnelId: string
  visitorKey: string
  anonymousId: string | null
  contactId: string | null
  variantKey: string | null
  experimentId: string | null
  firstStepId: string | null
  furthestStepIndex: number
  steps: Record<string, string>
  utmSource: string | null
  utmCampaign: string | null
  startedAt: string
  lastAt: string
  convertedAt: string | null
}

/**
 * Funnel progress per visitor (FR-TRK-4, FR-ANL-1). `stepIndex` resolves a step id to its
 * position in the published funnel; unknown steps count as index 0.
 */
export function journeyDeltas(
  events: TrackedEvent[],
  stepIndex: (funnelId: string, stepId: string) => number,
): JourneyDelta[] {
  const groups = new Map<string, TrackedEvent[]>()
  for (const e of events) {
    if (!e.funnelId || e.isBot) continue
    const visitorKey = e.anonymousId ?? e.sessionId
    const k = `${e.funnelId}|${visitorKey}`
    const g = groups.get(k)
    if (g) g.push(e)
    else groups.set(k, [e])
  }
  return [...groups.values()].map((g) => {
    g.sort(byTime)
    const first = g[0]!
    const steps: Record<string, string> = {}
    let furthest = 0
    for (const e of g) {
      if (!e.stepId) continue
      steps[e.stepId] ??= e.occurredAt
      furthest = Math.max(furthest, stepIndex(first.funnelId!, e.stepId))
    }
    const conversion = g.find((e) => isConversionEvent(e.name))
    return {
      workspaceId: first.workspaceId,
      funnelId: first.funnelId!,
      visitorKey: first.anonymousId ?? first.sessionId,
      anonymousId: first.anonymousId,
      contactId: g.find((e) => e.contactId)?.contactId ?? null,
      variantKey: g.find((e) => e.variantKey)?.variantKey ?? null,
      experimentId: g.find((e) => e.experimentId)?.experimentId ?? null,
      firstStepId: g.find((e) => e.stepId)?.stepId ?? null,
      furthestStepIndex: furthest,
      steps,
      utmSource: first.utmSource,
      utmCampaign: first.utmCampaign,
      startedAt: first.occurredAt,
      lastAt: g[g.length - 1]!.occurredAt,
      convertedAt: conversion?.occurredAt ?? null,
    }
  })
}
