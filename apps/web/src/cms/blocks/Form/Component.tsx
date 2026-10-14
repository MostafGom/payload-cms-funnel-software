import { getFormSnapshot } from '@/lib/forms'
import type { FormBlock as FormBlockData } from '@/payload-types'
import { FormEmbed } from './FormEmbed'
import { getPageContext } from '../../page-context'

/** Server part: renders the *published* form snapshot, the same version the API validates. */
export async function FormBlock({ form, heading, intro, privacyNote }: FormBlockData) {
  const formId = typeof form === 'object' ? form?.id : form
  if (!formId) return null
  const snapshot = await getFormSnapshot(String(formId))
  if (!snapshot) return null
  const ctx = getPageContext()
  return (
    <section className="block-form" id={`form-${snapshot.id}`}>
      {heading ? <h2>{heading}</h2> : null}
      {intro ? <p className="lead">{intro}</p> : null}
      <FormEmbed
        form={snapshot}
        nextUrl={ctx.nextStepPath}
        turnstileSiteKey={
          snapshot.spam.turnstile ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined
        }
      />
      {privacyNote ? <p className="fine-print">{privacyNote}</p> : null}
    </section>
  )
}
