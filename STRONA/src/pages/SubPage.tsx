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
  CLIENT_SPLIT,
  GUARANTEE_CREDIT,
  OUR_SPLIT,
  PARTNER_FIRM,
  PARTNER_FIRM_HREF,
  PASS_WINDOW,
  REFUND_WINDOW,
} from '../constants'
import { TrackRecordModal } from '../components/TrackRecord'
import { PAYOUT_CERTS, PAYOUT_TOTALS } from '../data/payouts'
import type { SubPageKey } from '../runtime/no-edge'

// The proof pages this component covers. /referral-program and /partner-portal
// each have their own file — see App.tsx.
type ProofPageKey = Exclude<SubPageKey, 'referral-program' | 'partner-portal' | 'google-funnel'>
import {
  CertCard,
  CSS,
  PerformanceWidget,
  REVIEWS,
  ReviewCard,
  SiteFooter,
  TermsCard,
  TopBar,
  track,
  useReveal,
} from './shared'

// Every CTA on these pages goes to the questionnaire on the money page — there
// is no second conversion anywhere on the site.
const APPLY_HREF = `/meta${APPLY_ANCHOR}`

type Meta = { eyebrow: string; title: string; lead: string }

const META: Record<ProofPageKey, Meta> = {
  payouts: {
    eyebrow: 'Verified records',
    title: 'Client payouts',
    lead: `Certificates ${PARTNER_FIRM} issued to Forex Passing clients — payouts released, evaluations passed, accounts funded. Pulled from the firm's public record, not typed up by us.`,
  },
  'past-performance': {
    eyebrow: 'Track record',
    title: 'Past performance',
    lead: 'How managed accounts have been run over time — equity curve, monthly returns and the trades behind them. The bad months are in there too.',
  },
  reviews: {
    eyebrow: 'What clients say',
    title: 'Reviews',
    lead: "Don't take our word for it. Here is what people say after we have run an evaluation or a funded account for them.",
  },
  contract: {
    eyebrow: 'Transparency · Protection',
    title: 'We put it in writing',
    lead: 'Nobody touches an account before a management agreement is signed. This is what is in it — read it before you apply, not after.',
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
          <h1 className="mm-sub-h1">{meta.title}</h1>
          <p className="mm-lead mm-center">{meta.lead}</p>
        </div>
      </header>

      {page === 'payouts' && <Payouts />}
      {page === 'past-performance' && <PastPerformance />}
      {page === 'reviews' && <Reviews />}
      {page === 'contract' && <Contract />}

      <section className="mm-sub-cta">
        <div className="mm-wrap">
          <h2>Want us to run yours?</h2>
          <p>
            Six questions, about two minutes. No payment, no card — we read it, check your firm's
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
          to Forex Passing clients, synced from the firm's public record. Individual results — an
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
 * A plain-language summary of the management agreement — not the agreement
 * itself. The signed document is what governs; this page exists so nobody has
 * to apply before finding out what they would be signing.
 * ------------------------------------------------------------------------ */

const CLAUSES: [string, string[]][] = [
  [
    'Who does what',
    [
      `You own the evaluation or funded account and buy it in your own name. We get trading access under the agreement — never ownership, never your firm login credentials beyond what trading requires.`,
      `Our desk trades it inside your firm's rules: daily loss limit, maximum drawdown, minimum trading days, news and weekend restrictions, all of it.`,
    ],
  ],
  [
    'The rule check comes first',
    [
      `Before anything starts we confirm your prop firm permits a third party to trade the account. Some do under a written arrangement, some ban it outright and void results. If yours bans it, we tell you and we do not take the account.`,
      `We work with ${PARTNER_FIRM}, whose terms allow managed accounts once the arrangement is approved in writing.`,
    ],
  ],
  [
    'What it costs',
    [
      `You keep ${CLIENT_SPLIT} of every payout. Our share is ${OUR_SPLIT}, invoiced after the firm has released the money to you — out of funds already in your account.`,
      `There is no monthly fee, no setup fee and nothing to pay while an evaluation is running. If no payout is ever released, we never earn anything.`,
    ],
  ],
  [
    'If it goes wrong',
    [
      `An evaluation can fail. If the account is lost while we are managing it, you get back what you paid us plus a ${GUARANTEE_CREDIT} credit toward the next attempt.`,
      `The guarantee runs for ${REFUND_WINDOW}. The exact wording, including what has to be returned, is in the agreement — it is the document that counts, not this page.`,
    ],
  ],
  [
    'Staying in control',
    [
      'Your platform login stays yours. You can watch every position, order and drawdown in real time while we trade.',
      'You can end it. The agreement sets the notice period and how access is revoked — changing the password ends our access immediately.',
    ],
  ],
  [
    'Your data',
    [
      'The questionnaire goes to our team and nowhere else. We use it to prepare the call and the agreement.',
      'We do not sell it and we do not pass it to third parties. See the privacy policy for what is stored and for how long.',
    ],
  ],
]

function Contract() {
  return (
    <>
      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <div className="mm-doc">
            {CLAUSES.map(([h, paras]) => (
              <div key={h}>
                <h3>{h}</h3>
                {paras.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ))}

            <h3>What we do not promise</h3>
            <p>
              That you will pass. Anyone promising that is lying: evaluations fail, markets do what
              they want and rules get breached. A typical pass takes {PASS_WINDOW}, and it can take
              longer or not happen at all. What we put in writing is what happens then.
            </p>
          </div>
        </div>
      </section>

      <section className="mm-section mm-reveal" style={{ background: 'var(--bg2)', paddingTop: 0 }}>
        <div className="mm-wrap" style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
          <TermsCard />
        </div>
      </section>
    </>
  )
}
