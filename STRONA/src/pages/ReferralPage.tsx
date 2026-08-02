// Forex Passing — /referral-program
//
// Laid out section for section like the reference partner page: its own top bar
// with a PARTNER LOGIN button, a marquee of programme terms, the tier cards,
// the portal preview, and a footer variant that only carries partner links.
//
// Everything a partner can actually do lives in ./PartnerPortal. This page is
// the pitch; that page is the product.

import { useEffect, useRef, useState } from 'react'
import {
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  GUARANTEE_CREDIT,
  OUR_SPLIT,
  REFERRAL_COMMISSION_RANGE,
  REFERRAL_PAYOUT_RANGE,
  REFERRAL_TIERS,
  REFERRAL_TIERS_DATA,
  REFUND_WINDOW,
  TELEGRAM_HREF,
} from '../constants'
import { fetchStats, PORTAL_ENABLED, referralUrl, type PartnerStats } from '../runtime/supabase'
import {
  AutoScroller,
  CSS,
  REVIEWS,
  ReviewCard,
  SiteFooter,
  track,
  useReveal,
} from './shared'

const MARQUEE = [
  `${REFERRAL_COMMISSION_RANGE} payout commission`,
  'No earnings cap',
  'Permanent partner tiers',
  'Free matching funded account',
]

const STATS: [string, string][] = [
  ['Tiers', String(REFERRAL_TIERS)],
  ['Commission', REFERRAL_COMMISSION_RANGE],
  ['Earnings cap', 'None'],
  ['Tier status', 'Permanent'],
]

const NOT_SCARED: [string, string][] = [
  [
    'Written management agreement.',
    'The same contract every client signs — they can read it before committing, not after.',
  ],
  [
    'Same failure protections.',
    `If we breach the rules and lose the account, the remedies are spelled out: refunded fees plus a ${GUARANTEE_CREDIT} credit, not a handshake.`,
  ],
  [
    "They're not the guinea pig.",
    'Your friend gets the same desk, the same transparency and the same track record you already checked yourself.',
  ],
]

const SAME_GUARANTEES: string[] = [
  `Challenge failure or a breach caused by us → remedies in writing, including refunded fees plus a ${GUARANTEE_CREDIT} credit.`,
  `${REFUND_WINDOW} refund guarantee — the same window and the same wording as the published offer.`,
  `Profit-share clarity: ${CLIENT_SPLIT} client / ${OUR_SPLIT} Forex Passing on payouts — the same structure they see at onboarding.`,
]

const PORTAL_POINTS = [
  'Your unique referral link — clicks tracked automatically',
  'Live confirmed vs. pending referral ledger',
  'Real-time tier progress toward Premium & Platinum',
  'Editable profile, testimonial & funded progress link',
]

const HOW_IT_WORKS: [string, string, string][] = [
  ['1', 'You refer a friend', 'Send them this page. They see the real contract, the guarantees and the terms — nothing hidden.'],
  ['2', 'Your friend applies', 'They send the questionnaire and get onboarded like any other Forex Passing client.'],
  ['3', 'We buy you the same size account — free', 'Once they are funded, we fund you a matching challenge account at the same size.'],
  ['4', 'You earn commission on every payout', `We manage both accounts hands-off, and you keep ${REFERRAL_COMMISSION_RANGE} of every payout your referral receives — for as long as they trade with us.`],
]

const FAQ: [string, string][] = [
  [
    'How do I refer someone?',
    'Open a partner account, copy your link and send it. Every click on it is tracked, so you do not have to chase anything or ask anyone to mention your name.',
  ],
  [
    'When do I get paid?',
    'Your commission is released once your referral has actually received a payout from their funded account. There is no waiting period beyond that — you earn when they earn.',
  ],
  [
    'Is there a cap on earnings?',
    'None. There is no ceiling and no limit on how many people you bring in. The more they get paid, the more you earn.',
  ],
  [
    'Can I lose my tier?',
    'No. Tiers are based on cumulative confirmed referrals — once you reach one it is permanent, and every tier keeps the rewards of the ones below it.',
  ],
]

export function ReferralPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  // A signed-in partner sees their own numbers in the portal preview; everyone
  // else sees the illustrative card, clearly labelled as a preview.
  const [stats, setStats] = useState<PartnerStats | null>(null)
  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: 'Referral programme' })
    if (PORTAL_ENABLED) void fetchStats().then(setStats)
  }, [])

  const marquee = [...MARQUEE, ...MARQUEE, ...MARQUEE]

  return (
    <div className="mm-root mm-root-sub mm-root-sticky" ref={rootRef}>
      <style>{CSS}</style>

      <div className="mm-topbar mm-topbar-split">
        <a href="/referral-program" className="mm-logo">
          <img className="mm-logo-img" src="/logo.svg" alt="Forex Passing" />
        </a>
        <a href="/partner-portal" className="mm-btn mm-btn-ghost mm-btn-sm mm-topbar-login">
          Partner login
        </a>
      </div>

      <div className="mm-refticker" aria-label="Programme terms">
        <div className="mm-refticker-track">
          {marquee.map((t, i) => (
            <span className="mm-refticker-item" key={t + i}>{t}</span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <header className="mm-refhero">
        <div className="mm-wrap">
          <span className="mm-refhero-eyebrow">Share it with someone you actually trust</span>
          <h1 className="mm-refhero-h1">
            YOUR FRIEND SAVES BIG.
            <span className="mm-teal">YOU GET A FREE ACCOUNT.</span>
          </h1>
          <p className="mm-warn">
            This page is built so you can forward it as it is: matching funded accounts, recurring
            commission, the full management agreement one tap away, and the same protections every
            Forex Passing client gets — so nobody has to just trust the hype.
          </p>
          <div className="mm-refhero-cta">
            <a
              href="/partner-portal"
              className="mm-btn mm-btn-lg"
              onClick={() => track('CTAClick', 'cta_click', { source: 'referral_hero' }, true)}
            >
              Open partner account
            </a>
            <a href="/contract" className="mm-btn mm-btn-ghost mm-btn-lg">See contract</a>
          </div>

          <div className="mm-refstats">
            {STATS.map(([k, v]) => (
              <div className="mm-refstat" key={k}>
                <span className="mm-refstat-k">{k}</span>
                <span className="mm-refstat-v">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* WHY YOUR FRIEND DOESN'T HAVE TO BE SCARED */}
      <section className="mm-section mm-reveal" style={{ background: 'var(--bg2)' }}>
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">WHY YOUR FRIEND DOESN'T HAVE TO BE SCARED</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Most hesitation isn't about the opportunity — it's about unknown risk. We take the
            guesswork out.
          </p>
          <div className="mm-checks">
            {NOT_SCARED.map(([t, d]) => (
              <div className="mm-check" key={t}>
                <span className="mm-check-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="mm-check-t">
                  {t}
                  <span className="mm-check-d">{d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REAL TRADERS. REAL RESULTS. */}
      <section className="mm-reviews mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center mm-reviews-h">REAL TRADERS. REAL RESULTS.</h2>
          <p className="mm-reviews-sub">
            Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews — proof you
            can point your friend to.
          </p>
        </div>
        {[0, 1].map((ri) => (
          <AutoScroller className="mm-scroller-rev" key={ri} reverse={ri === 1} speed={0.32} lock>
            {(ri === 0 ? [...REVIEWS, ...REVIEWS] : [...REVIEWS].reverse().concat([...REVIEWS].reverse())).map((r, i) => (
              <ReviewCard review={r} key={r.name + i} />
            ))}
          </AutoScroller>
        ))}
      </section>

      {/* SAME GUARANTEES FOR YOUR FRIEND */}
      <section className="mm-guar mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">SAME <span className="mm-teal">GUARANTEES</span> FOR YOUR FRIEND</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Referral pricing doesn't mean referral-tier protection. They get the full promise set —
            mirrored in the contract.
          </p>
          <div className="mm-checks">
            {SAME_GUARANTEES.map((t) => (
              <div className="mm-check" key={t}>
                <span className="mm-check-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="mm-check-t">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVERY TIER IS PERMANENT */}
      <section className="mm-section mm-reveal" id="tiers">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">For the person who referred</span>
          <h2 className="mm-h2 mm-center">EVERY TIER IS <span className="mm-teal">PERMANENT</span></h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Reach a tier once and it stays with you. Rewards compound — Premium and Platinum
            partners keep everything from the tiers below.
          </p>

          <div className="mm-tiers">
            {REFERRAL_TIERS_DATA.map((t) => (
              <div className={`mm-tier${t.highlight ? ' is-featured' : ''}`} key={t.code}>
                {t.highlight && <span className="mm-tier-flag">{t.badge}</span>}
                <div className="mm-tier-head">
                  <span className="mm-tier-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 3l2.5 5.3 5.5.8-4 4 .9 5.6L12 16l-4.9 2.7.9-5.6-4-4 5.5-.8z" /></svg>
                  </span>
                  <span className="mm-tier-code">{t.code}</span>
                </div>
                <h3 className="mm-tier-name">{t.name}</h3>
                <span className="mm-tier-range">{t.range}</span>

                <div className="mm-tier-box">
                  <span className="mm-tier-box-k">Per $10K payout</span>
                  <span className="mm-tier-box-v">{t.per10k}</span>
                  <span className="mm-tier-box-d">{t.commission}</span>
                </div>

                <p className="mm-tier-blurb">{t.blurb}</p>

                <span className="mm-tier-h">What you get</span>
                <ul className="mm-tier-perks">
                  {t.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>

                <div className="mm-tier-example">
                  <span className="mm-tier-h">Worked example</span>
                  <ol>
                    {t.example.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNER DASHBOARD */}
      <section className="mm-portal mm-reveal">
        <div className="mm-wrap mm-portal-grid">
          <div>
            <span className="mm-portal-eyebrow">Your partner dashboard</span>
            <h2 className="mm-portal-h2">TRACK EVERYTHING FROM ONE PORTAL.</h2>
            <p className="mm-portal-lead">
              Create a partner account in seconds, get your own tracked link, and watch clicks,
              referrals and tier progress update live. No spreadsheets, no chasing — just your
              numbers.
            </p>
            <ul className="mm-portal-points">
              {PORTAL_POINTS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="mm-portal-cta">
              <a
                href="/partner-portal"
                className="mm-btn mm-btn-lg"
                onClick={() => track('CTAClick', 'cta_click', { source: 'referral_portal' }, true)}
              >
                Open partner account
              </a>
              <a href="/partner-portal" className="mm-btn mm-btn-dark mm-btn-lg">Sign in</a>
            </div>
          </div>

          <PortalPreview stats={stats} />
        </div>
      </section>

      {/* HOW THE REFERRAL SYSTEM WORKS */}
      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">HOW THE REFERRAL SYSTEM WORKS</h2>
          <div className="mm-steps mm-steps-2">
            {HOW_IT_WORKS.map(([n, t, d]) => (
              <div className="mm-step mm-step-left" key={n}>
                <span className="mm-step-row">
                  <span className="mm-step-n">{n}</span>
                  <span className="mm-step-t">{t}</span>
                </span>
                <span className="mm-step-d">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURRING COMMISSION */}
      <section className="mm-recurring mm-reveal">
        <div className="mm-wrap">
          <span className="mm-recurring-eyebrow">Recurring commission</span>
          <h2 className="mm-recurring-h">
            $10K FRIEND PAYOUT → YOU KEEP <span className="mm-teal">{REFERRAL_PAYOUT_RANGE}</span>
          </h2>
          <p className="mm-recurring-sub">
            Paid the moment they get paid — <strong>no cap</strong>, no expiry, on every single
            payout.
          </p>
          <p className="mm-recurring-note">
            We stack the incentives so referring isn't awkward: your friend gets the same contract
            and protections, and you earn {REFERRAL_COMMISSION_RANGE} hands-free every time their
            account performs.
          </p>
        </div>
      </section>

      {/* QUESTIONS */}
      <section className="mm-section mm-faq mm-reveal">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">Common questions</span>
          <h2 className="mm-h2 mm-center">QUESTIONS, ANSWERED</h2>
          <div className="mm-acc">
            {FAQ.map(([q, a], i) => (
              <details className="mm-acc-item" key={q}>
                <summary>
                  <span className="mm-acc-n">{String(i + 1).padStart(2, '0')}</span>
                  {q}
                </summary>
                <p className="mm-acc-a">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FORWARD THIS LINK */}
      <section className="mm-forward mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">FORWARD THIS LINK. WE'LL HANDLE THE REST.</h2>
          <p className="mm-forward-sub">
            Questions on eligibility or payout timing? Message us on Telegram, or write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <div className="mm-forward-cta">
            <a href="/contract" className="mm-btn mm-btn-white mm-btn-lg">See contract</a>
            <a
              href={TELEGRAM_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-btn mm-btn-outline-white mm-btn-lg"
              onClick={() => track('CTAClick', 'cta_click', { source: 'referral_telegram' }, true)}
            >
              Message us on Telegram →
            </a>
          </div>
        </div>
      </section>

      <SiteFooter variant="referral" />

      <div className="mm-sticky-bar mm-sticky-bar-2">
        <a href="/contract" className="mm-btn mm-btn-ghost mm-btn-lg">Contract</a>
        <a
          href="/partner-portal"
          className="mm-btn mm-btn-lg"
          onClick={() => track('CTAClick', 'cta_click', { source: 'referral_sticky' }, true)}
        >
          Get started
        </a>
      </div>
    </div>
  )
}

/**
 * The dashboard card from the reference page. With a signed-in partner it shows
 * their real figures; otherwise it is an example and says so, so nobody reads
 * the placeholder numbers as our stats.
 */
function PortalPreview({ stats }: { stats: PartnerStats | null }) {
  const live = stats !== null
  const clicks = stats?.clicks ?? 128
  const confirmed = stats?.confirmed ?? 3
  const pending = stats?.pending ?? 1
  const tier = stats?.tier ?? 'Basic'
  const link = stats ? referralUrl(stats.slug) : 'forexpassing.com/r/yourname'
  const target = stats?.next_tier ? (stats.next_tier === 'Platinum' ? 5 : 2) : 5
  const toNext = stats?.to_next_tier ?? 2
  const pct = Math.min(100, Math.round((confirmed / target) * 100))

  return (
    <div className="mm-pcard">
      <div className="mm-pcard-head">
        <span className="mm-pcard-title">Partner portal · {tier}</span>
        <span className={`mm-pcard-badge${live ? '' : ' is-demo'}`}>{live ? '● Live' : 'Example'}</span>
      </div>

      <div className="mm-pcard-stats">
        <div><span className="mm-pcard-v">{clicks}</span><span className="mm-pcard-k">Clicks</span></div>
        <div><span className="mm-pcard-v">{confirmed}</span><span className="mm-pcard-k">Confirmed</span></div>
        <div><span className="mm-pcard-v">{pending}</span><span className="mm-pcard-k">Pending</span></div>
      </div>

      <div className="mm-pcard-link">
        <span>{link}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(`https://${link}`)}
          disabled={!live}
        >
          Copy
        </button>
      </div>

      <div className="mm-pcard-progress">
        <div className="mm-pcard-progress-head">
          <span>Tier progress</span>
          <span>{confirmed} / {target}</span>
        </div>
        <div className="mm-pcard-track"><div className="mm-pcard-fill" style={{ width: `${pct}%` }} /></div>
        <span className="mm-pcard-note">
          {stats?.next_tier
            ? `${toNext} more confirmed referral${toNext === 1 ? '' : 's'} to unlock ${stats.next_tier}.`
            : live
              ? 'Top tier reached — everything below stays yours.'
              : 'Example view. Open a partner account to see your own numbers.'}
        </span>
      </div>
    </div>
  )
}
