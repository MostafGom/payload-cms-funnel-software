import type { ReactNode } from 'react'
import { safeJson } from '@/lib/json'
import { getSiteConfig } from '@/lib/site-config'
import './sites.css'

/**
 * Site shell (ADR-0015). Static per deploy+config: the SDK reads region/consent from cookies at
 * runtime, so pages stay cacheable. The banner markup is server-rendered (no layout shift; the
 * SDK only toggles it) and is WCAG 2.2 AA: dialog role, labelled, keyboard reachable (NFR-12).
 */
export default async function SitesLayout({ children }: { children: ReactNode }) {
  const cfg = await getSiteConfig()
  const sdkConfig = {
    siteKey: cfg.siteKey,
    endpoint: '/_t/e',
    ...cfg.sdk,
    consent: { policyVersion: cfg.consent.policyVersion, bannerVersion: cfg.consent.bannerVersion },
    pixels: cfg.pixels,
  }
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <div
          data-fp-banner=""
          role="dialog"
          aria-modal="false"
          aria-labelledby="fp-banner-title"
          aria-describedby="fp-banner-body"
          className="fp-banner"
          hidden
          // The SDK owns visibility and choices; it may run before hydration.
          suppressHydrationWarning
        >
          <h2 id="fp-banner-title">{cfg.consent.title}</h2>
          <p id="fp-banner-body">
            {cfg.consent.body} <a href={cfg.consent.privacyPolicyUrl}>Privacy policy</a>
          </p>
          <fieldset data-fp-choices="" hidden suppressHydrationWarning>
            <legend>Choose what you allow</legend>
            <label>
              <input type="checkbox" checked disabled /> Necessary
            </label>
            <label>
              <input
                type="checkbox"
                name="analytics"
                data-fp-purpose="analytics"
                suppressHydrationWarning
              />{' '}
              Analytics
            </label>
            <label>
              <input
                type="checkbox"
                name="marketing"
                data-fp-purpose="marketing"
                suppressHydrationWarning
              />{' '}
              Marketing
            </label>
          </fieldset>
          <div className="fp-banner__actions">
            <button type="button" className="button button--secondary" data-fp-consent="reject">
              {cfg.consent.rejectLabel}
            </button>
            <button type="button" className="button button--secondary" data-fp-consent="choose">
              {cfg.consent.manageLabel}
            </button>
            <button type="button" className="button" data-fp-consent="accept">
              {cfg.consent.acceptLabel}
            </button>
          </div>
        </div>
        <script
          id="fp-config"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: safeJson(sdkConfig) }}
        />
        <script src="/assets/fp.js" defer />
      </body>
    </html>
  )
}
