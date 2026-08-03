// Forex Passing — /google-funnel
//
// The lander for Google Ads traffic, kept deliberately bare: a logo, a risk
// disclosure, one sentence of offer and one button. No marquee, no video, no
// proof strip, no countdown — everything that reads as pressure is off this
// page on purpose, because it is the one an ad reviewer opens.
//
// The button opens the same questionnaire the offer page uses.

import { useEffect, useState } from 'react'
import { ApplyModal } from '../components/ApplyFlow'
import { GOOGLE_CTA_LABEL } from '../constants'
import { SiteFooter, track } from './shared'

export function GoogleFunnel() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: 'Google lander' })
  }, [])

  return (
    <div className="mm-root mm-root-sub mm-gf">

      <div className="mm-topbar">
        <a href="/google-funnel" className="mm-logo">
          <img className="mm-logo-img" src="/logo.webp" alt="Forex Passing" />
        </a>
      </div>

      <p className="mm-gf-risk">
        Risk disclosure: trading and prop firm evaluations involve substantial risk of loss. Past
        performance is not indicative of future results. Individual outcomes vary and are not
        guaranteed.
      </p>

      <main className="mm-gf-main">
        <h1 className="mm-gf-h1">We help you automate your trading</h1>
        <p className="mm-gf-sub">Apply for our service now</p>
        <button
          type="button"
          className="mm-btn mm-btn-lg mm-gf-cta"
          onClick={() => {
            track('CTAClick', 'cta_click', { source: 'google' }, true)
            setOpen(true)
          }}
        >
          {GOOGLE_CTA_LABEL}
        </button>
      </main>

      <SiteFooter variant="blank" />

      {open && <ApplyModal initialName="" source="google" onClose={() => setOpen(false)} />}
    </div>
  )
}
