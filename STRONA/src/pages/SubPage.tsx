// Forex Passing — the footer subpages: /payouts, /past-performance, /reviews,
// /contract.
//
// Every link in the footer resolves to a real URL with its own page, the same
// way the reference funnel routes its proof pages. A visitor who lands on
// /reviews straight from an ad gets a complete page — header, proof, the same
// call to action, the same footer — not an anchor halfway down the offer.
//
// All four share one shell: hero, body, CTA band, footer. The proof widgets and
// the stylesheet come from ./shared, so nothing here can drift away from what
// the money page shows.

import { useEffect, useRef, useState } from 'react'
import {
  APPLY_ANCHOR,
  GUARANTEE_CREDIT,
  PARTNER_FIRM,
  PARTNER_FIRM_HREF,
  REFUND_WINDOW,
} from '../constants'
import { ContractModal } from '../components/AgreementDocument'
import { TrackRecordModal } from '../components/TrackRecord'
import { PAYOUT_CERTS, PAYOUT_TOTALS } from '../data/payouts'
import type { SubPageKey } from '../runtime/no-edge'

// The proof pages this component covers. /referral-program and /partner-portal
// each have their own file — see App.tsx.
type ProofPageKey = Exclude<SubPageKey, 'referral-program' | 'partner-portal' | 'google-funnel'>
import {
  AutoScroller,
  CertCard,
  CSS,
  PerformanceWidget,
  REVIEWS,
  ReviewCard,
  SiteFooter,
  TopBar,
  track,
  useReveal,
} from './shared'

// Every CTA on these pages goes to the questionnaire on the money page — there
// is no second conversion anywhere on the site.
const APPLY_HREF = `/meta${APPLY_ANCHOR}`

type Meta = {
  eyebrow: string
  title: string
  lead: string
  /** Second headline line, set in the accent colour. */
  accent?: string
  /** 'alert' sets the lead in the warning colour, as on /contract. */
  leadTone?: 'alert'
}

const META: Record<ProofPageKey, Meta> = {
  payouts: {
    eyebrow: 'Verified records',
    title: 'Client payouts',
    lead: `Certificates ${PARTNER_FIRM} issued to Forex Passing clients: payouts released, evaluations passed, accounts funded. Pulled from the firm's public record, not typed up by us.`,
  },
  'past-performance': {
    eyebrow: 'Track record',
    title: 'Past performance',
    lead: 'How managed accounts have been run over time: equity curve, monthly returns and the trades behind them. The bad months are in there too.',
  },
  reviews: {
    eyebrow: 'What clients say',
    title: 'Reviews',
    lead: "Don't take our word for it. Here is what people say after we have run an evaluation or a funded account for them.",
  },
  contract: {
    eyebrow: 'Transparency · Protection · Real traders',
    title: 'We put everything',
    accent: 'in writing',
    lead: `You shouldn't have to guess what happens if something goes wrong. Read the agreement, see how traders rate us, and know exactly how our guarantee works, including the refund guarantee that runs for ${REFUND_WINDOW} if we don't pass or you want out.`,
    leadTone: 'alert' as const,
  },
}

export function SubPage({ page }: { page: ProofPageKey }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: `Subpage: ${page}` })
  }, [page])

  const meta = META[page]

  return (
    <div className="mm-root mm-root-sub" ref={rootRef}>
      <style>{CSS}</style>

      <TopBar href="/meta" />

      <header className="mm-sub-hero">
        <div className="mm-wrap">
          <a href="/meta" className="mm-sub-back">← Back to the offer</a>
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">{meta.eyebrow}</span>
          <h1 className="mm-sub-h1">
            {meta.title}
            {meta.accent && (
              <>
                <br />
                <span className="mm-sub-h1-accent">{meta.accent}</span>
              </>
            )}
          </h1>
          <p className={`mm-lead mm-center${meta.leadTone === 'alert' ? ' mm-lead-alert' : ''}`}>
            {meta.lead}
          </p>
        </div>
      </header>

      {page === 'payouts' && <Payouts />}
      {page === 'past-performance' && <PastPerformance />}
      {page === 'reviews' && <Reviews />}
      {page === 'contract' && <Contract />}

      {page !== 'contract' && (
      <section className="mm-sub-cta">
        <div className="mm-wrap">
          <h2>Want us to run yours?</h2>
          <p>
            A short questionnaire, about three minutes. No payment, no card. We read it, check your firm's
            rules and come back to you.
          </p>
          <a
            href={APPLY_HREF}
            className="mm-btn mm-btn-lg"
            onClick={() => track('CTAClick', 'cta_click', { source: 'subpage' }, true)}
          >
            Start your application
          </a>
        </div>
      </section>
      )}

      <SiteFooter variant="proof" />
    </div>
  )
}

/* --------------------------------------------------------------------------
 * /payouts
 * ------------------------------------------------------------------------ */

function Payouts() {
  if (PAYOUT_CERTS.length === 0) {
    // No records in the firm's API means no proof — say so rather than filling
    // the page with something we made up.
    return (
      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <p className="mm-disclaimer">
            No certificates have been published yet. They appear here as {PARTNER_FIRM} issues them.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mm-section mm-payouts mm-reveal">
      <div className="mm-wrap">
        {PAYOUT_TOTALS && (
          <p className="mm-lead mm-center mm-lead-mid">
            <strong>{PAYOUT_TOTALS.totalUsd}</strong> released across{' '}
            <strong>{PAYOUT_TOTALS.count}</strong> payouts, largest{' '}
            <strong>{PAYOUT_TOTALS.largestUsd}</strong>, with{' '}
            <strong>{PAYOUT_TOTALS.fundedAccounts}</strong> accounts funded.
          </p>
        )}

        <div className="mm-cert-grid">
          {PAYOUT_CERTS.map((c, i) => (
            <CertCard cert={c} key={c.trader + c.date + c.amount + i} />
          ))}
        </div>

        <p className="mm-disclaimer" style={{ marginTop: 40 }}>
          Certificates issued by{' '}
          <a href={PARTNER_FIRM_HREF} target="_blank" rel="noopener noreferrer">
            {PARTNER_FIRM}
          </a>{' '}
          to Forex Passing clients, synced from the firm's public record. Individual results vary. An
          evaluation can fail and no outcome is guaranteed.
        </p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * /past-performance
 * ------------------------------------------------------------------------ */

function PastPerformance() {
  // The widget is the page; the full record — risk profiles, trade split, risk
  // detail — opens in the same window the offer page uses.
  const [open, setOpen] = useState(false)

  return (
    <section className="mm-section mm-perf mm-reveal">
      <div className="mm-wrap">
        <PerformanceWidget />

        <div className="mm-cta-center">
          <button
            type="button"
            className="mm-btn mm-btn-lg"
            onClick={() => {
              track('CTAClick', 'cta_click', { source: 'past_performance' }, true)
              setOpen(true)
            }}
          >
            View full track record
          </button>
        </div>

        {open && <TrackRecordModal onClose={() => setOpen(false)} />}

        <p className="mm-disclaimer" style={{ marginTop: 40 }}>
          Past performance does not predict future results. Every account is traded inside its own
          firm's risk rules, so the numbers on any individual account will differ from what is shown
          here. An evaluation can fail and a funded account can be breached.
        </p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * /reviews
 * ------------------------------------------------------------------------ */

function Reviews() {
  return (
    <section className="mm-section mm-reveal" style={{ background: 'var(--bg)' }}>
      <div className="mm-wrap">
        <p className="mm-reviews-sub mm-center">
          Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews
        </p>

        <div className="mm-rev-grid">
          {REVIEWS.map((r, i) => (
            <ReviewCard review={r} key={r.name + i} />
          ))}
        </div>

        <p className="mm-disclaimer" style={{ marginTop: 40 }}>
          Reviews describe individual experiences and are not a promise of any outcome. Past
          performance does not indicate future results.
        </p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * /contract
 *
 * The agreement is the product's only hard proof, so the page is built round
 * one action — open it and read it. Every band ends with the same pair of
 * buttons, and a bar carries them at the foot of the screen the whole way down,
 * because the moment somebody decides to check the wording is not predictable.
 *
 * The document itself lives in a modal rather than inline: a contract laid out
 * flat down a marketing page reads as more marketing.
 * ------------------------------------------------------------------------ */

const PROMISES: [string, string][] = [
  [
    'Almost no downside on your side.',
    'If we lose the account, you are covered by what the agreement says, not by a vague promise made on a landing page.',
  ],
  [
    `A window of ${REFUND_WINDOW}.`,
    `Evaluation failed, or you simply want out inside ${REFUND_WINDOW}? The guarantee clause covers both, and it is clause 5, not a footnote.`,
  ],
  [
    'Nothing starts before the rule check.',
    'We confirm in writing whether your firm allows a third party to trade the account. If it does not, we do not take it, and you are told, not billed.',
  ],
]

const GUARANTEES: [string, React.ReactNode][] = [
  [
    'If we lose your challenge',
    <>
      you get back what you paid us <strong>plus a {GUARANTEE_CREDIT} credit</strong> toward the
      next attempt, spelled out in clause 5 of the agreement.
    </>,
  ],
  [
    `Refund guarantee for ${REFUND_WINDOW}`,
    <>
      whether the evaluation fails or you decide you want out. The terms and the process are in the
      written contract.
    </>,
  ],
  [
    'You keep the login',
    <>
      you watch every position and drawdown in real time, and changing the password ends our access
      on the spot. That is clause 3, and it is why you are not taking a leap of faith.
    </>,
  ],
]

function Contract() {
  const [open, setOpen] = useState(false)

  const see = (source: string) => () => {
    track('ViewContract', 'view_contract', { source })
    setOpen(true)
  }

  return (
    <>
      <section className="mm-section mm-ctr-top">
        <div className="mm-wrap">
          <div className="mm-ctr-card">
            {PROMISES.map(([head, body]) => (
              <div className="mm-ctr-row" key={head}>
                <span className="mm-ctr-tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7.5 12.4l3.1 3.1 6-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p>
                  <strong>{head}</strong> {body}
                </p>
              </div>
            ))}
          </div>

          <ContractActions onSee={see('hero')} />
        </div>
      </section>

      <section className="mm-band mm-band-teal mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-band-h">Our reviews</h2>
          <p className="mm-band-sub">
            Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews
          </p>
        </div>
        <AutoScroller className="mm-band-rail" ariaLabel="Client reviews" speed={0.45}>
          {REVIEWS.map((r, i) => (
            <ReviewCard review={r} key={r.name + i} />
          ))}
        </AutoScroller>
      </section>

      <section className="mm-band mm-band-mint mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-band-h">
            Our <span>guarantee</span>
          </h2>
          <p className="mm-band-sub">
            No motivational fluff. Just what we stand behind, and where to find it in writing.
          </p>

          <div className="mm-gcards">
            {GUARANTEES.map(([head, body]) => (
              <div className="mm-gcard" key={head}>
                <span className="mm-gcard-tick" aria-hidden="true">✓</span>
                <p>
                  <strong>{head}</strong>, {body}
                </p>
              </div>
            ))}
          </div>

          <div className="mm-center" style={{ marginTop: 34 }}>
            <button type="button" className="mm-btn mm-btn-lg mm-btn-forest" onClick={see('guarantee')}>
              <DocIcon /> See contract
            </button>
          </div>
        </div>
      </section>

      <section className="mm-section mm-reveal mm-center">
        <div className="mm-wrap">
          <h2 className="mm-h2">Ready when you are</h2>
          <p className="mm-lead mm-center" style={{ maxWidth: 560, margin: '0 auto 26px' }}>
            Questions belong in the application. It walks you through the whole thing, and nothing
            is charged for asking.
          </p>
          <a
            href={APPLY_HREF}
            className="mm-btn mm-btn-lg"
            onClick={() => track('CTAClick', 'cta_click', { source: 'contract_ready' }, true)}
          >
            Continue to the offer
          </a>
        </div>
      </section>

      <div className="mm-sticky-bar mm-sticky-bar-2">
        <button type="button" className="mm-btn mm-btn-ghost mm-btn-lg" onClick={see('sticky')}>
          See contract
        </button>
        <a
          href={APPLY_HREF}
          className="mm-btn mm-btn-lg"
          onClick={() => track('CTAClick', 'cta_click', { source: 'contract_sticky' }, true)}
        >
          Apply
        </a>
      </div>

      <ContractModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" style={{ marginRight: 8, verticalAlign: -3 }}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

/** The same pair of buttons that sits in the bar, repeated inside the page. */
function ContractActions({ onSee }: { onSee: () => void }) {
  return (
    <div className="mm-ctr-actions">
      <button type="button" className="mm-btn mm-btn-ghost mm-btn-lg" onClick={onSee}>
        <DocIcon /> See contract
      </button>
      <a
        href={APPLY_HREF}
        className="mm-btn mm-btn-lg"
        onClick={() => track('CTAClick', 'cta_click', { source: 'contract_hero' }, true)}
      >
        Apply now →
      </a>
    </div>
  )
}
