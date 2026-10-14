import type { FaqBlock as FaqBlockData } from '@/payload-types'

/** Native <details> keeps it accessible and JS-free; FAQPage JSON-LD helps SEO. */
export function FaqBlock({ heading, items }: FaqBlockData) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (items ?? []).map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  }
  return (
    <section className="block-faq">
      {heading ? <h2>{heading}</h2> : null}
      {items?.map((i) => (
        <details key={i.id}>
          <summary>{i.question}</summary>
          <p>{i.answer}</p>
        </details>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </section>
  )
}
