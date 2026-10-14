import type { FooterBlock as FooterBlockData } from '@/payload-types'

export function FooterBlock({ text, links, showPrivacyChoices }: FooterBlockData) {
  return (
    <footer className="block-footer">
      {text ? <p>{text}</p> : null}
      <nav aria-label="Footer">
        {links?.map((l) => (
          <a key={l.id} href={l.href}>
            {l.label}
          </a>
        ))}
        {showPrivacyChoices !== false ? (
          <button type="button" className="linklike" data-fp-consent-open="">
            Your privacy choices
          </button>
        ) : null}
      </nav>
    </footer>
  )
}
