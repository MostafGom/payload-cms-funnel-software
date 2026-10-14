import type { Access, FieldAccess } from 'payload'

/** RBAC roles (requirements §1 personas). Order matters only for display. */
export const ROLES = ['owner', 'admin', 'marketer', 'analyst', 'support'] as const
export type Role = (typeof ROLES)[number]

type WithRoles = { roles?: Role[] | null } | null | undefined

export const hasRole = (user: WithRoles, ...roles: Role[]): boolean =>
  !!user?.roles?.some((r) => roles.includes(r))

export const isAdmin: Access = ({ req }) => hasRole(req.user as WithRoles, 'owner', 'admin')
export const isAuthenticated: Access = ({ req }) => !!req.user
export const canEditContent: Access = ({ req }) =>
  hasRole(req.user as WithRoles, 'owner', 'admin', 'marketer')
export const isAdminField: FieldAccess = ({ req }) =>
  hasRole(req.user as WithRoles, 'owner', 'admin')

/** Published docs are public; drafts only for signed-in users. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

/** CRM write access: everyone except analysts (read-only reporting role). */
export const canEditCrm: Access = ({ req }) =>
  hasRole(req.user as WithRoles, 'owner', 'admin', 'marketer', 'support')

/** Destinations, email settings, DSAR: configuration with legal or financial impact. */
export const canConfigure: Access = ({ req }) =>
  hasRole(req.user as WithRoles, 'owner', 'admin', 'marketer')

/** PII fields are hidden from analysts (requirements §1 personas, ADR-0012). */
export const piiRead: FieldAccess = ({ req }) =>
  !!req.user &&
  !(hasRole(req.user as WithRoles, 'analyst') && !hasRole(req.user as WithRoles, 'owner', 'admin'))

/** Server-only writes (form pipeline, workers); never through the REST API. */
export const nobody: Access = () => false
