// Forex Passing — /thank-you, the page an accepted applicant lands on.
//
// Reached exactly one way: the questionnaire is scored server-side
// (api/_lib/lead-quality.js), api/event/subscribe.js answers `hq: true`, and
// ApplyFlow sends the person here. Nothing links to it, emit-routes.mjs marks it
// noindex, and both the Worker (workers/edge.ts) and the origin backstop
// (middleware.ts) hand the safe page to bots and ad reviewers instead.
//
// Its whole job is the handover to Telegram: prove which accounts are ours,
// prove which handles are ours, and make the next click obvious to someone who
// has never used the app. Every number on the page comes from constants.ts or
// from the prop firm's public record (data/payouts.ts). The places we cannot
// fill yet — the video, the two photos, the team figures — render as reserved
// slots rather than as claims; see constants.ts for how to publish each one.
//
// It fires NO conversion event. `Lead` already went out from the form, and a
// second one here would count the same applicant twice.

import { useEffect, useRef, useState } from 'react'
import {
  BRAND_GREEN,
  CONTACT_EMAIL,
  PARTNER_FIRM,
  SITE_DOMAIN,
  TEAM_PHOTO_SRC,
  TEAM_SIZE,
  TEAM_YEARS,
  TELEGRAM_ADMIN_HANDLE,
  TELEGRAM_CHANNEL_HANDLE,
  TELEGRAM_CHANNEL_HREF,
  TELEGRAM_HREF,
  TYP_TELEGRAM_SHOT_SRC,
  WISTIA_TYP_ID,
} from '../constants'
import { FAQ } from '../data/faq'
import { PAYOUT_TOTALS } from '../data/payouts'
import { TESTIMONIALS } from '../data/testimonials'
import {
  AutoScroller,
  REVIEWS,
  ReviewBadge,
  ReviewCard,
  SiteFooter,
  TestimonialCard,
  TopBar,
  track,
  useReveal,
} from './shared'

/* --------------------------------------------------------------------------
 * Pieces
 * ------------------------------------------------------------------------ */

/**
 * A picture we do not have yet. Renders the exact rectangle the artwork will
 * occupy, so dropping the file in later moves nothing on the page — the same
 * reason ReviewBadge reserves its height and the country flag in the
 * application carries an explicit 20×15 box.
 */
function ImageSlot({
  src,
  alt,
  ratio,
  label,
}: {
  src: string
  alt: string
  ratio: string
  label: string
}) {
  if (!src) {
    return (
      <div className="mm-typ-slot" style={{ aspectRatio: ratio }}>
        <span className="mm-typ-slot-label">{label}</span>
      </div>
    )
  }
  return (
    <img
      className="mm-typ-shot"
      src={src}
      alt={alt}
      style={{ aspectRatio: ratio }}
      loading="lazy"
      decoding="async"
    />
  )
}

/**
 * The one video on this page. Same facade as the hero on /meta: nothing is
 * requested from Wistia until someone presses play, and if the player never
 * upgrades — ad blockers do this constantly on mobile — we say so instead of
 * leaving a dead rectangle.
 *
 * Empty WISTIA_TYP_ID reserves the frame rather than hiding the section, so the
 * page keeps its shape while the clip is being cut.
 */
function TypVideo() {
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!started || !WISTIA_TYP_ID) return

    for (const [src, module] of [
      ['https://fast.wistia.com/player.js', false],
      [`https://fast.wistia.com/embed/${WISTIA_TYP_ID}.js`, true],
    ] as const) {
      if (document.querySelector(`script[src="${src}"]`)) continue
      const s = document.createElement('script')
      s.src = src
      s.async = true
      if (module) s.type = 'module'
      document.head.appendChild(s)
    }

    const timer = window.setTimeout(() => {
      if (!customElements.get('wistia-player')) setFailed(true)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [started])

  if (!WISTIA_TYP_ID) {
    return (
      <div className="mm-typ-video-frame is-empty">
        <span className="mm-typ-slot-label">Video going up here</span>
      </div>
    )
  }

  return (
    <div className="mm-typ-video-frame">
      {!started ? (
        <button
          type="button"
          className="mm-typ-video-facade"
          onClick={() => {
            track('VideoPlay', 'video_start', { source: 'thank_you' }, true)
            setStarted(true)
          }}
        >
          <span className="mm-vsl-play" aria-hidden="true" />
          <span className="mm-typ-video-facade-label">Play video</span>
        </button>
      ) : failed ? (
        <div className="mm-vsl-failed">
          <p>The video could not load — an ad blocker or tracking protection is usually the cause.</p>
          <p>You can turn it off for this page, or just message us on Telegram and ask.</p>
        </div>
      ) : (
        <wistia-player
          media-id={WISTIA_TYP_ID}
          aspect="1.7777777777777777"
          player-color={BRAND_GREEN}
          playback-rate-control="false"
          settings-control="false"
          resumable="false"
          controls-visible-on-load="true"
          autoplay="true"
        />
      )}
    </div>
  )
}

/** The repeated call to action. `channel` is the one people join, `admin` the one they write to. */
function TelegramCta({
  label,
  to,
  source,
  note,
  white = false,
}: {
  label: string
  to: 'channel' | 'admin'
  source: string
  note?: string
  white?: boolean
}) {
  return (
    <div className="mm-cta-center">
      <a
        href={to === 'channel' ? TELEGRAM_CHANNEL_HREF : TELEGRAM_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className={`mm-btn mm-btn-lg${white ? ' mm-btn-white' : ''}`}
        onClick={() => track('CTAClick', 'cta_click', { source }, true)}
      >
        {label}
      </a>
      {note && <p className="mm-typ-cta-note">{note}</p>}
    </div>
  )
}

function TickIcon() {
  return (
    <span className="mm-typ-tick-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

// Why Telegram is not the risk people think it is. Every line is something the
// agreement or the firm's public record backs up — that is the actual answer to
// the question, and it is checkable in a way "1 billion users" is not.
const REASSURANCE: { t: string; d: string; href?: string; hrefLabel?: string }[] = [
  {
    t: 'The account stays in your name',
    d: 'You buy the evaluation yourself, at your firm. We get trading access under the agreement, never ownership, and you can revoke it by changing the password.',
  },
  {
    t: 'Nothing is paid to us upfront',
    d: 'Our share is invoiced after a payout has already landed with you. There is no subscription and no fee for trying.',
  },
  {
    t: 'Everything is in writing first',
    d: 'Risk limits, the split, the guarantee and how you exit are in the management agreement. Read it before you sign, not after.',
    href: '/contract',
    hrefLabel: 'Read the agreement',
  },
  {
    t: 'You can check the payouts yourself',
    d: `The certificates come from ${PARTNER_FIRM}'s own public record, not from a screenshot we made.`,
    href: '/payouts',
    hrefLabel: 'See the certificates',
  },
]

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export function ThankYouPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  // Only clips that exist. The "being filmed" slots earn their place on
  // /reviews, where they say more is coming; directly under "you are qualified"
  // they read as a page that ran out of proof.
  const clips = TESTIMONIALS.filter((t) => t.videoId)

  // Doubled so each marquee wraps seamlessly, second row running the other way.
  const reviewRows = [
    [...REVIEWS, ...REVIEWS],
    [...[...REVIEWS].reverse(), ...[...REVIEWS].reverse()],
  ]

  // Built by pushing rather than by filtering a sparse literal: an unset figure
  // has no tile at all, and no cast is needed to say so.
  const teamStats: { n: string; l: string }[] = []
  if (TEAM_SIZE) teamStats.push({ n: TEAM_SIZE, l: 'Person team' })
  if (TEAM_YEARS) teamStats.push({ n: TEAM_YEARS, l: 'Years combined' })

  return (
    <div className="mm-root mm-root-sub mm-typ" ref={rootRef}>
      <TopBar />

      {/* ── QUALIFIED ─────────────────────────────────────────────────── */}
      <header className="mm-typ-hero">
        <div className="mm-wrap">
          <TickIcon />
          <h1 className="mm-h1 mm-center mm-typ-h1">
            YOU ARE <span className="mm-teal">QUALIFIED</span>
          </h1>
          <p className="mm-lead mm-center mm-lead-mid">
            Your application cleared our checks. The next step is one message on Telegram: we confirm
            your firm allows a third party to trade the account, agree the size, and put the
            agreement in writing. Nothing is charged before any of that.
          </p>
        </div>
      </header>

      {/* ── NEXT STEP: VIDEO ──────────────────────────────────────────── */}
      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <div className="mm-typ-video">
            <div className="mm-typ-video-head">
              <span className="mm-typ-video-eyebrow">YOUR NEXT STEP</span>
              <span className="mm-typ-video-title">Watch this before you message us</span>
            </div>
            <TypVideo />
          </div>
        </div>
      </section>

      {/* ── WHERE TO CLICK ────────────────────────────────────────────── */}
      <section className="mm-section mm-typ-howto mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">WHERE TO CLICK</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Open the channel, then send us a message. Both handles are listed further down — check
            them against this page before you write to anybody.
          </p>
          <div className="mm-typ-shot-wrap">
            <ImageSlot
              src={TYP_TELEGRAM_SHOT_SRC}
              alt="Where to tap in Telegram: message the admin, then press Join"
              ratio="16 / 10"
              label="Telegram screenshot going here"
            />
          </div>
          <TelegramCta
            label="JOIN TELEGRAM NOW"
            to="channel"
            source="typ_join_top"
            note="Tap above to open the channel, then send us a message to get started."
          />
        </div>
      </section>

      {/* ── OFFICIAL CHANNELS ─────────────────────────────────────────── */}
      <section className="mm-section mm-typ-official mm-reveal">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">VERIFIED &amp; OFFICIAL</span>
          <h2 className="mm-h2 mm-center">BEFORE YOU MESSAGE US</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Twenty seconds to confirm you are talking to the real Forex Passing, and to see exactly
            who you will be working with.
          </p>

          <div className="mm-typ-card">
            <div className="mm-typ-card-head">
              <h3 className="mm-h3">OFFICIAL FOREX PASSING COMMUNICATION</h3>
              <p>People impersonate services like ours. These are our only channels.</p>
            </div>

            <div className="mm-typ-channels">
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official website</span>
                <span className="mm-typ-channel-v">{SITE_DOMAIN}</span>
              </div>
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official email</span>
                <span className="mm-typ-channel-v">{CONTACT_EMAIL}</span>
              </div>
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official Telegram</span>
                <span className="mm-typ-channel-v">{TELEGRAM_CHANNEL_HANDLE}</span>
                <span className="mm-typ-channel-sub">and {TELEGRAM_ADMIN_HANDLE}</span>
              </div>
            </div>

            {/* The two sentences that actually stop the common fraud: nobody
                legitimate needs the trading password, and our share is invoiced,
                never collected to a personal wallet. */}
            <p className="mm-typ-warn">
              These are our <strong>only</strong> accounts. If anyone contacts you from a different
              one claiming to be Forex Passing, it is <strong>not us</strong>. We will never ask you
              for your platform password, and we will never ask you to send money to a personal
              wallet or card.
            </p>
          </div>
        </div>
      </section>

      {/* ── TEAM + WHAT YOU'RE JOINING ────────────────────────────────── */}
      <section className="mm-section mm-typ-two mm-reveal">
        <div className="mm-wrap">
          <div className="mm-typ-cols">
            <div className="mm-typ-col">
              <h3 className="mm-typ-col-h">MEET YOUR TEAM</h3>
              <ImageSlot
                src={TEAM_PHOTO_SRC}
                alt="The Forex Passing team"
                ratio="4 / 3"
                label="Team photo going here"
              />
              {/* Rendered only for figures that were actually supplied. An empty
                  constant drops the tile — a number nobody gave us is not a
                  number we are going to invent. */}
              {teamStats.length > 0 && (
                <div className="mm-typ-stats">
                  {teamStats.map((s) => (
                    <div className="mm-typ-stat" key={s.l}>
                      <span className="mm-typ-stat-n">{s.n}</span>
                      <span className="mm-typ-stat-l">{s.l}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mm-typ-col-d">
                The desk that trades the account and the people who answer when you write. Ask any of
                us anything before you sign — that is what the first conversation is for.
              </p>
            </div>

            <div className="mm-typ-col">
              <h3 className="mm-typ-col-h">WHAT YOU'RE JOINING</h3>
              <ReviewBadge />
              <div className="mm-typ-proof">
                {PAYOUT_TOTALS && (
                  <>
                    <div className="mm-typ-proof-row">
                      <strong>{PAYOUT_TOTALS.count}</strong> payout certificates issued by{' '}
                      {PARTNER_FIRM}
                    </div>
                    <div className="mm-typ-proof-row">
                      <strong>{PAYOUT_TOTALS.totalUsd}</strong> released to clients, largest{' '}
                      {PAYOUT_TOTALS.largestUsd}
                    </div>
                    <div className="mm-typ-proof-row">
                      <strong>{PAYOUT_TOTALS.fundedAccounts}</strong> funded accounts under
                      management
                    </div>
                  </>
                )}
                <div className="mm-typ-proof-row">
                  A written management agreement on <strong>every</strong> account
                </div>
              </div>
              <p className="mm-typ-col-d">
                Every certificate is pulled from the firm's public record, not made here.{' '}
                <a href="/payouts">Check them yourself</a>.
              </p>
            </div>
          </div>

          <TelegramCta label="MESSAGE US ON TELEGRAM" to="admin" source="typ_message_team" />
        </div>
      </section>

      {/* ── THE OBJECTION ─────────────────────────────────────────────── */}
      <section className="mm-section mm-typ-note mm-reveal">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">QUICK NOTE BEFORE YOU JOIN</span>
          <h2 className="mm-h2 mm-center">"ISN'T TELEGRAM WHERE SCAMMERS HANG OUT?"</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Fair question, and worth asking. We use it because it keeps the whole relationship fast,
            visible and in one place instead of behind a dashboard you never hear from. But the app
            is not what protects you here — the paperwork is.
          </p>
          <div className="mm-typ-grid4">
            {REASSURANCE.map((r) => (
              <div className="mm-typ-tile" key={r.t}>
                <TickIcon />
                <span className="mm-typ-tile-t">{r.t}</span>
                <span className="mm-typ-tile-d">{r.d}</span>
                {r.href && (
                  <a className="mm-typ-tile-a" href={r.href}>
                    {r.hrefLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
          <TelegramCta label="MESSAGE US ON TELEGRAM" to="admin" source="typ_message_objection" />
        </div>
      </section>

      {/* ── CLIPS — see the warning at the top of data/testimonials.ts ─── */}
      {clips.length > 0 && (
        <section className="mm-section mm-testi mm-reveal">
          <div className="mm-wrap">
            <h2 className="mm-h2 mm-center">VIDEO TESTIMONIALS</h2>
            <p className="mm-lead mm-center mm-lead-mid">
              The short version is written under each video.
            </p>
            <div className="mm-testi-grid">
              {clips.map((t) => (
                <TestimonialCard testimonial={t} key={t.videoId} />
              ))}
            </div>
            <p className="mm-disclaimer" style={{ marginTop: 26 }}>
              Individual results. Past performance is not indicative of future results, an evaluation
              can fail, and no outcome is guaranteed.
            </p>
            <TelegramCta label="JOIN TELEGRAM &amp; GET STARTED" to="channel" source="typ_join_clips" />
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="mm-section mm-faq mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">FREQUENTLY ASKED QUESTIONS</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Guarantees, fees and how we work. Straight answers, including the ones that are a no.
          </p>
          <div className="mm-acc">
            {FAQ.map((f) => (
              <details className="mm-acc-item" key={f.q}>
                <summary>{f.q}</summary>
                <p className="mm-acc-a">{f.a}</p>
              </details>
            ))}
          </div>
          <TelegramCta label="READY? JOIN TELEGRAM" to="channel" source="typ_join_faq" />
        </div>
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────────────── */}
      <section className="mm-reviews mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center mm-reviews-h">OUR VERIFIED REVIEWS</h2>
          <ReviewBadge onDark />
          <p className="mm-reviews-sub">
            Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews
          </p>
        </div>
        {reviewRows.map((row, ri) => (
          <AutoScroller className="mm-scroller-rev" key={ri} reverse={ri === 1} speed={0.32} lock>
            {row.map((r, i) => (
              <ReviewCard review={r} key={r.name + i} />
            ))}
          </AutoScroller>
        ))}
        <div className="mm-wrap">
          <TelegramCta label="JOIN TELEGRAM NOW" to="channel" source="typ_join_bottom" white />
        </div>
      </section>

      <SiteFooter variant="proof" />
    </div>
  )
}
