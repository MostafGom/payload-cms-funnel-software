import type { HeroBlock as HeroBlockData } from '@/payload-types'

export function HeroBlock({ headline, subheadline, cta }: HeroBlockData) {
  return (
    <section className="block-hero">
      <h1>{headline}</h1>
      {subheadline ? <p className="lead">{subheadline}</p> : null}
      {cta?.label && cta.href ? (
        <a className="button" href={cta.href} data-track="hero_cta">
          {cta.label}
        </a>
      ) : null}
    </section>
  )
}
