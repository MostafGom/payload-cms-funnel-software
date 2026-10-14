import Image from 'next/image'
import type { Media, TestimonialsBlock as TestimonialsBlockData } from '@/payload-types'

export function TestimonialsBlock({ heading, items }: TestimonialsBlockData) {
  return (
    <section className="block-testimonials">
      {heading ? <h2>{heading}</h2> : null}
      <ul className="grid">
        {items?.map((t) => {
          const avatar = typeof t.avatar === 'object' ? (t.avatar as Media | null) : null
          return (
            <li key={t.id}>
              <figure>
                {t.rating ? (
                  <p className="rating" aria-label={`${t.rating} out of 5`}>
                    {'★'.repeat(t.rating)}
                  </p>
                ) : null}
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  {avatar?.url ? (
                    <Image src={avatar.url} alt="" width={40} height={40} className="avatar" />
                  ) : null}
                  <span>
                    <strong>{t.author}</strong>
                    {t.role ? <> · {t.role}</> : null}
                  </span>
                </figcaption>
              </figure>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
