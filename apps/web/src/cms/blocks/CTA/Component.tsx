import type { CtaBlock as CtaBlockData } from '@/payload-types'

export function CtaBlock({ headline, body, buttons }: CtaBlockData) {
  return (
    <section className="block-cta">
      <h2>{headline}</h2>
      {body ? <p>{body}</p> : null}
      <div className="actions">
        {buttons?.map((b) => (
          <a
            key={b.id}
            className={`button button--${b.style ?? 'primary'}`}
            href={b.href}
            data-track="cta"
          >
            {b.label}
          </a>
        ))}
      </div>
    </section>
  )
}
