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

import { useEffect, useRef } from 'react'
import {
  APPLY_ANCHOR,
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  GUARANTEE_CREDIT,
  OUR_SPLIT,
  PARTNER_FIRM,
  PARTNER_FIRM_HREF,
  PASS_WINDOW,
  REFERRAL_COMMISSION_RANGE,
  REFERRAL_TIERS,
  REFUND_WINDOW,
  TELEGRAM_HREF,
} from '../constants'
import { PAYOUT_CERTS, PAYOUT_TOTALS } from '../data/payouts'
import type { SubPageKey } from '../runtime/no-edge'
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

const META: Record<SubPageKey, Meta> = {
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
  'referral-program': {
    eyebrow: 'Share it with someone you actually trust',
    title: 'They get their account run. You get paid.',
    lead: 'Send someone in and you earn on every payout they receive, for as long as they stay. Three tiers, no earnings cap, and a tier you reach is a tier you keep.',
  },
}

export function SubPage({ page }: { page: SubPageKey }) {
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
      {page === 'referral-program' && <Referral />}

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

      <SiteFooter />
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
  return (
    <section className="mm-section mm-perf mm-reveal">
      <div className="mm-wrap">
        <PerformanceWidget />
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

/* --------------------------------------------------------------------------
 * /referral-program
 *
 * Modelled on the reference funnel's partner programme: three cumulative
 * tiers, a worked example per tier, no earnings cap, tier status permanent.
 *
 * ⚠ One deliberate difference. Theirs pays commission out of the friend's
 * payout; ours pays it out of OUR management fee (see constants.ts). At their
 * basis a 15% commission would hand over half of everything we earn, on every
 * payout, forever. Switching to their basis is a one-line change in EXAMPLE
 * below — it is a commercial decision, not a layout one.
 * ------------------------------------------------------------------------ */

const REFERRAL_STATS: [string, string][] = [
  ['Tiers', String(REFERRAL_TIERS)],
  ['Commission', REFERRAL_COMMISSION_RANGE],
  ['Earnings cap', 'None'],
  ['Tier status', 'Permanent'],
]

type Tier = {
  code: string
  name: string
  badge: string
  range: string
  commission: string
  highlight?: boolean
  blurb: string
  perks: string[]
  example: string[]
}

const TIERS: Tier[] = [
  {
    code: 'T-01',
    name: 'Basic',
    badge: 'Open to everyone',
    range: '0–2 referrals',
    commission: '10%',
    blurb:
      'Earn from your first referral. When someone you sent in gets funded, we buy you a matching evaluation at the same size — free. On top of that you keep 10% of our fee on every payout they receive.',
    perks: [
      'Matching evaluation at zero cost once they are funded',
      '10% commission on every payout your referral receives',
      'No minimum number of referrals',
      'Nothing to pay, ever — you are never invoiced',
    ],
    example: [
      'Your friend receives a $10,000 payout',
      `They keep ${CLIENT_SPLIT} — $7,000 — and our fee is ${OUR_SPLIT}, $3,000`,
      'You earn 10% of our $3,000 fee = $300',
      'Plus a matching evaluation, free',
    ],
  },
  {
    code: 'T-02',
    name: 'Premium',
    badge: 'Most chosen',
    range: '2–5 referrals',
    commission: '15%',
    highlight: true,
    blurb:
      'Send in two or more and the rate goes up. You keep the matching evaluations, add a free $100K evaluation on top, and your commission climbs to 15% of our fee on every payout they generate.',
    perks: [
      'Everything in Basic',
      'Free $100K evaluation on top of the matched ones',
      'Commission raised to 15%',
      'Your referrals are queued ahead of the general list',
    ],
    example: [
      'Your friend receives a $10,000 payout',
      `They keep ${CLIENT_SPLIT} — $7,000 — and our fee is ${OUR_SPLIT}, $3,000`,
      'You earn 15% of our $3,000 fee = $450',
      'Plus a free $100K evaluation on top of the matched ones',
    ],
  },
  {
    code: 'T-03',
    name: 'Platinum',
    badge: 'Elite',
    range: '5+ referrals',
    commission: '15%',
    blurb:
      'The top tier, for partners who bring in five or more traders. A free $200K evaluation, priority when you want the account size raised, and first place in the queue for management.',
    perks: [
      'Everything in Premium',
      'Free $200K evaluation',
      'Priority support for funding increases',
      'First in the queue for managed accounts',
    ],
    example: [
      'Your friend receives a $10,000 payout',
      `They keep ${CLIENT_SPLIT} — $7,000 — and our fee is ${OUR_SPLIT}, $3,000`,
      'You earn 15% of our $3,000 fee = $450',
      'Plus a free $200K evaluation and priority placement',
    ],
  },
]

const REFERRAL_FAQ = [
  {
    q: 'How do I refer someone?',
    a: 'Forward this page, or send them to our Telegram and have them mention your name when they get in touch. We record it from there — you do not have to chase anything.',
  },
  {
    q: 'When do I get paid?',
    a: 'Your commission is released once your referral has actually received a payout from their funded account and our fee has been settled. No waiting period beyond that — you earn when they earn.',
  },
  {
    q: 'Is there a cap?',
    a: 'No. There is no ceiling on how much you can earn and no limit on how many people you send in.',
  },
  {
    q: 'Can I lose my tier?',
    a: 'No. Tiers are based on cumulative referrals — once you reach one it is yours, and every tier keeps the rewards of the ones below it.',
  },
]

function Referral() {
  return (
    <>
      <section className="mm-section mm-reveal" style={{ paddingBottom: 0 }}>
        <div className="mm-wrap">
          <div className="mm-refstats">
            {REFERRAL_STATS.map(([k, v]) => (
              <div className="mm-refstat" key={k}>
                <span className="mm-refstat-v">{v}</span>
                <span className="mm-refstat-k">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">THE TIERS</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Cumulative, and they only go up. Everything in a lower tier stays yours when you reach
            the next one.
          </p>

          <div className="mm-tiers">
            {TIERS.map((t) => (
              <div className={`mm-tier${t.highlight ? ' is-featured' : ''}`} key={t.code}>
                <span className="mm-tier-badge">{t.badge}</span>
                <span className="mm-tier-code">{t.code}</span>
                <h3 className="mm-tier-name">{t.name}</h3>
                <span className="mm-tier-range">{t.range}</span>
                <span className="mm-tier-commission">{t.commission}<small>of our fee</small></span>
                <p className="mm-tier-blurb">{t.blurb}</p>

                <ul className="mm-tier-perks">
                  {t.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>

                <div className="mm-tier-example">
                  <span className="mm-tier-example-h">What that looks like</span>
                  <ol>
                    {t.example.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          <p className="mm-disclaimer" style={{ marginTop: 36 }}>
            Commission is a share of the management fee we actually collect, so it exists only when
            your referral has been paid. Evaluations can fail and payouts are never guaranteed —
            these figures describe how the split works, not an expected income.
          </p>
        </div>
      </section>

      <section className="mm-section mm-faq mm-reveal" style={{ background: 'var(--bg2)' }}>
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">QUESTIONS</h2>
          <div className="mm-acc">
            {REFERRAL_FAQ.map((f) => (
              <details className="mm-acc-item" key={f.q}>
                <summary>{f.q}</summary>
                <p className="mm-acc-a">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mm-cta-center">
            <a
              href={TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn mm-btn-lg"
              onClick={() => track('CTAClick', 'cta_click', { source: 'referral' }, true)}
            >
              Become a partner
            </a>
          </div>
          <p className="mm-disclaimer" style={{ marginTop: 18 }}>
            Message us on Telegram or write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
            we will set you up.
          </p>
        </div>
      </section>
    </>
  )
}
