// Forex Passing — /freeaccount
//
// The free-account offer, message-matched to the reference funnel (mgmtfree):
// we get the visitor a prop firm challenge at no cost, pass it, and manage the
// funded account — the visitor pays nothing until a payout has actually landed,
// then keeps CLIENT_SPLIT of it.
//
// Same chrome, proof and questionnaire as the /meta offer page — only the
// promise at the top of the funnel differs. Nothing is sold here; the single
// conversion is the application questionnaire, which opens in a modal from every
// button on the page.

import { useEffect, useRef, useState } from 'react'
import { ApplyModal } from '../components/ApplyFlow'
import { CLIENT_SPLIT, CTA_LABEL, OUR_SPLIT, PARTNER_FIRM } from '../constants'
import { PAYOUT_CERTS } from '../data/payouts'
import {
  AutoScroller,
  CertCard,
  HeroVsl,
  REVIEWS,
  ReviewBadge,
  ReviewCard,
  SiteFooter,
  TopBar,
  track,
  useReveal,
} from './shared'

// The challenge size we promise to cover, single-sourced so the hero, the steps
// and the guarantees can never quote three different numbers.
const CHALLENGE_SIZE = '$25K'

// The marquee items — the deal in one line each. Doubled at render so the strip
// wraps seamlessly.
const TICKER = [
  `Free ${CHALLENGE_SIZE} prop firm challenge`,
  'We pass it and manage it for you',
  'Zero cost — pay only after payout',
  `You keep ${CLIENT_SPLIT} of the profit`,
  'The account stays in your name',
  'No upfront fees, no monthly charge',
]

// How the free program runs, in order. Message-matched to the reference funnel.
const HOW: [string, string, string][] = [
  ['01', 'We get your challenge', `We secure your ${CHALLENGE_SIZE} prop firm challenge at no cost to you. You pay nothing upfront.`],
  ['02', 'We pass & manage it', "Our desk passes the challenge and manages the funded account under the firm's rules — free."],
  ['03', 'You get paid', `Payouts go directly to you. No management fees until your first payout lands — then you keep ${CLIENT_SPLIT}, we take ${OUR_SPLIT}.`],
]

// What the client gets, at zero cost. CheckRows, same as the offer page.
const GET: string[] = [
  'Zero cost to you — we cover the challenge.',
  'Free account management from day one.',
  'Your payouts are sent directly to you.',
  'You stay in control of your own account.',
  'No hidden fees or upfront payments required.',
]

function TopTicker() {
  const items = [...TICKER, ...TICKER]
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > 140 && y > last) setHidden(true)
      else if (y < last || y < 80) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const check = (
    <span className="mm-ticker-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#fff" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  )
  return (
    <div className={`mm-ticker${hidden ? ' mm-ticker-hidden' : ''}`} aria-label="Announcements">
      <div className="mm-ticker-track">
        {items.map((t, i) => (
          <span className="mm-ticker-item" key={t + i}>{check}{t}</span>
        ))}
      </div>
    </div>
  )
}

function endOfTodayMs() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

// Daily-resetting urgency countdown, same status as the one on /meta:
// ⚠ Invented scarcity, kept by an explicit owner decision — it resets every
// midnight and is not tied to a real spot count. Remove it if the funnel ever
// needs to hold up to an ad-platform review.
function Countdown() {
  const target = useRef(endOfTodayMs())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (now >= target.current) target.current = endOfTodayMs()
  let s = Math.max(0, Math.floor((target.current - now) / 1000))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  s %= 3600
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return <span className="mm-count">{h}:{m}:{sec}</span>
}

function CheckIcon() {
  return (
    <span className="mm-check-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
    </span>
  )
}

function CheckRow({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mm-check">
      <CheckIcon />
      <span className="mm-check-t">
        {title}
        {detail && <span className="mm-check-d">{detail}</span>}
      </span>
    </div>
  )
}

// The one button on the page. Every instance opens the same questionnaire.
function Cta({ onOpen, source, className = '' }: { onOpen: () => void; source: string; className?: string }) {
  return (
    <button
      type="button"
      className={`mm-btn mm-btn-lg ${className}`}
      onClick={() => {
        track('CTAClick', 'cta_click', { source }, true)
        onOpen()
      }}
    >
      {CTA_LABEL}
    </button>
  )
}

function CtaRow({ onOpen, source, tight }: { onOpen: () => void; source: string; tight?: boolean }) {
  return (
    <div className={`mm-cta-center${tight ? ' mm-cta-center-tight' : ''}`}>
      <Cta onOpen={onOpen} source={source} />
    </div>
  )
}

const FAQ: [string, string][] = [
  ['Is it really free?', `Yes. We get your ${CHALLENGE_SIZE} prop firm challenge for you and manage it at zero cost. There is no challenge purchase, no upfront fee and no monthly charge from you.`],
  ['So how do you make money?', `Only after a payout is released. You keep ${CLIENT_SPLIT} of it, we take ${OUR_SPLIT}. If nothing is ever paid out, there is nothing to split and you owe us nothing.`],
  ['Who actually trades the account?', "Our trading desk, under a written agreement, inside the firm's risk rules. You are not expected to watch charts or place a single order."],
  ['Whose account is it?', 'Yours. It is registered in your name at the prop firm. We get trading access under the agreement, never ownership, and payouts land with you.'],
  ['What if the challenge fails?', "A losing evaluation that stayed inside the firm's rules is not a breach; markets do that and no service can promise otherwise. What happens next is written into the agreement before you start, not explained afterwards."],
  ['How do I start?', 'Answer a few short questions below. If it is a fit, the team reaches out on Telegram, we confirm the firm allows managed accounts, and we get your free challenge going.'],
]

export function FreeAccountPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const cards = [...PAYOUT_CERTS, ...PAYOUT_CERTS]
  const reviewRows = [
    [...REVIEWS, ...REVIEWS],
    [...[...REVIEWS].reverse(), ...[...REVIEWS].reverse()],
  ]

  useReveal(rootRef)

  const [applyOpen, setApplyOpen] = useState(false)
  const openApply = () => setApplyOpen(true)

  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: 'Free account' })
  }, [])

  return (
    <div className="mm-root" ref={rootRef}>

      <TopTicker />
      <TopBar />

      {/* HERO — we get you the challenge for free and manage it */}
      <section className="mm-hero mm-hero-solo" id="top">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">100% free program</span>
          <h1 className="mm-h1 mm-h1-solo">
            WE GET YOU A FREE {CHALLENGE_SIZE} CHALLENGE &amp; MANAGE IT{' '}
            <span className="mm-teal">(PAY ONLY AFTER PAYOUT)</span>
          </h1>
          <p className="mm-warn mm-warn-hero">
            No cost to you at all. We get the {CHALLENGE_SIZE} challenge for you and manage it for
            you — completely free. You pay us nothing until a payout has actually landed in your
            account. The short video below walks through exactly how it works.
          </p>
          <HeroVsl badge="100% free program" title="Watch how your free account works" source="free_hero" />
          <div className="mm-cta-row mm-cta-center-row">
            <Cta onOpen={openApply} source="free_hero" />
            <a href="#how" className="mm-btn mm-btn-ghost mm-btn-lg">See how it works</a>
          </div>
          <p className="mm-microtrust">Nothing to pay on this page · Questionnaire first · Firm rules checked before we start</p>
        </div>
        <div className="mm-hero-glow" aria-hidden="true" />
      </section>

      {/* HOW IT WORKS */}
      <section className="mm-section mm-mech mm-reveal" id="how">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">How it works</span>
          <h2 className="mm-h2 mm-center">Three steps, <span className="mm-teal">zero cost to you</span></h2>
          <p className="mm-lead mm-lead-mid mm-center">
            We get your {CHALLENGE_SIZE} challenge for free. You pay nothing. We pass it and manage
            it for you.
          </p>

          <div className="mm-steps">
            {HOW.map(([n, t, d]) => (
              <div className="mm-step" key={n}>
                <span className="mm-step-n">{Number(n)}</span>
                <span className="mm-step-t">{t}</span>
                <span className="mm-step-d">{d}</span>
              </div>
            ))}
          </div>

          <CtaRow onOpen={openApply} source="how" />
        </div>
      </section>

      {/* STATEMENT BAND */}
      <section className="mm-band mm-reveal">
        <div className="mm-wrap">
          <p className="mm-band-text">ZERO COST TO YOU.</p>
          <p className="mm-band-sub">We cover the challenge. You pay nothing until a payout has actually landed in your account.</p>
        </div>
      </section>

      {/* PAYOUT CERTIFICATES — real records from the partner firm's public API */}
      {cards.length > 0 && (
        <section className="mm-section mm-payouts mm-reveal" id="payouts">
          <div className="mm-wrap">
            <h2 className="mm-h2 mm-center">THIS IS WHAT OUR CLIENTS WALK AWAY WITH</h2>
            <p className="mm-lead mm-center mm-lead-mid">
              Certificates {PARTNER_FIRM} issued to our clients: payouts released, evaluations
              passed, accounts funded. Scan any of them and the firm confirms it.
            </p>
          </div>

          <AutoScroller className="mm-scroller-cert" ariaLabel="Payout certificates" speed={0.55}>
            {cards.map((c, i) => (
              <CertCard cert={c} key={c.trader + c.date + c.amount + i} />
            ))}
          </AutoScroller>

          <div className="mm-wrap">
            <p className="mm-disclaimer">
              Certificates issued by {PARTNER_FIRM} to Forex Passing clients, pulled live from the
              firm's public record. Individual results vary. An evaluation can fail and no outcome is
              guaranteed.
            </p>
            <CtaRow onOpen={openApply} source="payouts" />
          </div>
        </section>
      )}

      {/* WHAT YOU GET */}
      <section className="mm-section mm-system mm-reveal" id="get">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">Your side of the deal</span>
          <h2 className="mm-h2 mm-center">What you <span className="mm-teal">get, free</span></h2>
          <p className="mm-lead mm-lead-mid mm-center">
            The terms are short on purpose. Read them before you apply, not after.
          </p>
          <div className="mm-checks">
            {GET.map((t) => (
              <CheckRow title={t} key={t} />
            ))}
          </div>
          <CtaRow onOpen={openApply} source="get" />
        </div>
      </section>

      {/* SKEPTIC */}
      <section className="mm-band mm-reveal">
        <div className="mm-wrap">
          <p className="mm-band-sub">
            Every client who got a free account had to decide whether this was real. That is why we
            show the process, the proof and the protection before you apply.
          </p>
        </div>
      </section>

      {/* APPLICATION — the only conversion on the page */}
      <section className="mm-section mm-pricing mm-reveal" id="apply">
        <div className="mm-wrap">
          <div className="mm-price-proof" role="list" aria-label="Proof">
            <span className="mm-price-proof-item" role="listitem"><strong>4.9/5</strong> from 500+ traders</span>
            <span className="mm-price-proof-sep" aria-hidden="true" />
            <span className="mm-price-proof-item" role="listitem"><strong>{CHALLENGE_SIZE}</strong> challenge, on us</span>
            <span className="mm-price-proof-sep" aria-hidden="true" />
            <span className="mm-price-proof-item" role="listitem"><strong>{CLIENT_SPLIT}/{OUR_SPLIT}</strong> split, paid after payout</span>
          </div>

          {/* ⚠ Invented scarcity, kept by an explicit owner decision. */}
          <p className="mm-warn mm-warn-mb">
            Limited free spots left. Today's applications close in <Countdown />
          </p>

          <CtaRow onOpen={openApply} source="apply" tight />

          <p className="mm-disclaimer" style={{ marginTop: 22 }}>
            A few questions and your contact details, about a minute. Nothing to pay. The rule check
            comes first, then a call, then the agreement.
          </p>
        </div>
      </section>

      {/* VERIFIED REVIEWS */}
      <section className="mm-reviews mm-reveal" id="reviews">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center mm-reviews-h">OUR VERIFIED REVIEWS</h2>
          <ReviewBadge onDark />
          <p className="mm-reviews-sub">Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews</p>
        </div>
        {reviewRows.map((row, ri) => (
          <AutoScroller className="mm-scroller-rev" key={ri} reverse={ri === 1} speed={0.32} lock>
            {row.map((r, i) => (
              <ReviewCard review={r} key={r.name + i} />
            ))}
          </AutoScroller>
        ))}
      </section>

      {/* GUARANTEES */}
      <section className="mm-guar mm-reveal" id="guarantees">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">100% <span className="mm-teal">FREE</span>, IN WRITING</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Straightforward protection, so you know exactly where you stand.
          </p>
          <div className="mm-checks">
            <CheckRow
              title={`We get your ${CHALLENGE_SIZE} challenge and manage it at zero cost to you.`}
              detail="Free account, free management. You bring nothing to the table but the go-ahead."
            />
            <CheckRow
              title="No hidden fees, no challenge purchase, no upfront payment."
              detail="Nothing leaves your pocket to get started. There is no monthly charge and no fee for trying."
            />
            <CheckRow
              title="You pay nothing until your first payout has actually landed."
              detail={`Only then do we take our ${OUR_SPLIT} share, out of money already in your hands. You keep ${CLIENT_SPLIT}.`}
            />
          </div>
          <CtaRow onOpen={openApply} source="guarantees" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mm-section mm-faq mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">FREQUENTLY ASKED QUESTIONS</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            The free program, the split and how we work. Straight answers.
          </p>
          <div className="mm-acc">
            {FAQ.map(([q, a]) => (
              <details className="mm-acc-item" key={q}>
                <summary>{q}</summary>
                <p className="mm-acc-a">{a}</p>
              </details>
            ))}
          </div>
          <CtaRow onOpen={openApply} source="faq" />
        </div>
      </section>

      <SiteFooter variant="meta" />

      {/* One step, visible the whole way down the page. */}
      <div className="mm-sticky-bar">
        <Cta onOpen={openApply} source="sticky" />
      </div>

      {applyOpen && (
        <ApplyModal initialName="" source="free" onClose={() => setApplyOpen(false)} />
      )}
    </div>
  )
}
