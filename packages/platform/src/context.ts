/**
 * Passed into every module service (ADR-0013). Carrying workspaceId from day one keeps
 * multi-tenancy a configuration change rather than a refactor.
 */
export type Actor =
  | { kind: 'system'; name: string }
  | { kind: 'user'; id: string; roles: readonly string[] }
  | { kind: 'visitor'; anonymousId?: string }

export interface RequestContext {
  readonly workspaceId: number
  readonly actor: Actor
  readonly traceId?: string
}

export const DEFAULT_WORKSPACE_ID = 1

export function systemContext(name: string, traceId?: string): RequestContext {
  return { workspaceId: DEFAULT_WORKSPACE_ID, actor: { kind: 'system', name }, traceId }
}
