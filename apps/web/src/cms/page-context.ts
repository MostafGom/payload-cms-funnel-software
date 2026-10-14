import { cache } from 'react'

/** Per-request render context shared by the page and its blocks (React server `cache`). */
export interface PageContext {
  pageId?: string
  funnelId?: string
  stepId?: string
  variantKey?: string
  experimentId?: string
  /** path of the next funnel step, used by forms with "go to next step" */
  nextStepPath?: string
}

const store = cache((): { ctx: PageContext } => ({ ctx: {} }))

export const setPageContext = (ctx: PageContext): void => {
  store().ctx = ctx
}
export const getPageContext = (): PageContext => store().ctx
