import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import type { ReactNode } from 'react'

/** Wraps a custom admin view in Payload's chrome and requires a signed-in user. */
export function AdminShell({
  props,
  title,
  children,
}: {
  props: AdminViewServerProps
  title: string
  children: ReactNode
}) {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult
  if (!req.user) redirect('/admin/login')
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <h1 style={{ margin: '24px 0' }}>{title}</h1>
        {children}
      </Gutter>
    </DefaultTemplate>
  )
}

export const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, marginBottom: 32 }
export const cell = {
  borderBottom: '1px solid var(--theme-elevation-150)',
  padding: '6px 8px',
  textAlign: 'left' as const,
}
