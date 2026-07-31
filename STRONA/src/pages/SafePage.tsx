// ⚠ CASE STUDY — "safe" page. Cloaking gate (App.tsx) renders this for everyone
// who is NOT classified `human` (reviewers, bots, suspicious). Calm, education-first
// "educational company" variant modeled on a generic trading-education site (mgmtfx).
// No purchase / no checkout — an application form instead. The face shown to reviewers.

import { useEffect, useState, type FormEvent } from 'react'

const STATS: [string, string][] = [
  ['500+', 'Students'],
  ['95%', 'Success Rate'],
  ['50+', 'Courses'],
  ['24/7', 'Support'],
]

type IconKey = 'chart' | 'people' | 'book' | 'target'

const WHY: { icon: IconKey; t: string; d: string }[] = [
  { icon: 'chart', t: 'Market analysis', d: 'Learn to read charts and identify high-probability setups with a repeatable framework.' },
  { icon: 'people', t: 'Community', d: 'Join a network of like-minded traders sharing insights and progress every day.' },
  { icon: 'book', t: 'Education', d: 'Structured courses from beginner to advanced — built around process, not hype.' },
  { icon: 'target', t: 'Precision', d: 'Develop the discipline for consistent, accurate, rule-based trade execution.' },
]

function Icon({ k }: { k: IconKey }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (k === 'chart') return <svg viewBox="0 0 24 24" {...common}><path d="M3 17l6-6 4 4 7-7" /><path d="M17 4h4v4" /></svg>
  if (k === 'people') return <svg viewBox="0 0 24 24" {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16.5 6.5a3 3 0 0 1 0 6" /><path d="M21 20c0-2.4-1.2-4-3-4.7" /></svg>
  if (k === 'book') return <svg viewBox="0 0 24 24" {...common}><path d="M3 5h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2H3z" /><path d="M21 5h-6a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2H21z" /></svg>
  return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
}

export function SafePage() {
  const year = new Date().getFullYear()
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Hide the sticky CTA whenever any in-page CTA (hero "Get Started" or the
  // form "Apply now") is on screen — never show two buttons at once.
  const [hideSticky, setHideSticky] = useState(false)
  useEffect(() => {
    const targets = document.querySelectorAll('.mm-cta-row .mm-btn:not(.mm-btn-ghost), .mm-form-btn')
    if (!targets.length || !('IntersectionObserver' in window)) {
      setHideSticky(false)
      return
    }
    const visible = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        })
        setHideSticky(visible.size > 0)
      },
      { rootMargin: '0px 0px -84px 0px', threshold: 0 }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [sent])
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting) return
    const data = Object.fromEntries(new FormData(e.currentTarget))
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/event/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('failed')
      setSent(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="mm-root">
      <style>{CSS}</style>

      {/* NAV — minimal */}
      <header className="mm-nav">
        <div className="mm-wrap mm-nav-inner">
          <a href="#top" className="mm-logo"><img className="mm-logo-img" src="/logo.svg" alt="Forex Passing" /></a>
          <nav className="mm-nav-links">
            <a href="#top">Home</a>
            <a href="#why">About Us</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mm-hero" id="top">
        <div className="mm-wrap">
          <h1 className="mm-h1">HELLO, WE ARE AN<br /><span className="mm-blue">EDUCATIONAL COMPANY</span></h1>
          <p className="mm-lead mm-lead-mid">
            We teach aspiring traders the strategies, discipline, and mindset needed to
            approach the markets with a clear, repeatable process.
          </p>
          <div className="mm-cta-row">
            <a href="#apply" className="mm-btn mm-btn-lg">Get Started</a>
            <a href="#why" className="mm-btn mm-btn-ghost mm-btn-lg">Learn More</a>
          </div>
          <p className="mm-microtrust">Education first · No signals · No profit promises</p>
        </div>
        <div className="mm-hero-glow" aria-hidden="true" />
      </section>

      {/* STATS BAND */}
      <section className="mm-stats">
        <div className="mm-wrap mm-stats-grid">
          {STATS.map(([v, k]) => (
            <div className="mm-stat" key={k}>
              <span className="mm-stat-v">{v}</span>
              <span className="mm-stat-k">{k}</span>
            </div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="mm-section mm-why" id="why">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">Why choose <span className="mm-blue">Forex Passing</span></h2>
          <div className="mm-why-grid">
            {WHY.map((c) => (
              <div className="mm-why-card" key={c.t}>
                <span className="mm-why-ico"><Icon k={c.icon} /></span>
                <span className="mm-why-t">{c.t}</span>
                <span className="mm-why-d">{c.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* READY TO START — application form (no purchase) */}
      <section className="mm-journey" id="apply">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">Ready to start your <span className="mm-blue">journey?</span></h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Take the first step. Tell us a little about yourself and we'll be in touch about
            joining the program.
          </p>

          {sent ? (
            <div className="mm-form-ok" role="status">
              <span className="mm-form-ok-ico" aria-hidden="true">✓</span>
              <span className="mm-form-ok-t">Thanks — your application is in.</span>
              <span className="mm-form-ok-d">We'll reach out by email. No payment is required to apply.</span>
            </div>
          ) : (
            <form className="mm-form" onSubmit={onSubmit}>
              <input
                className="mm-hp"
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <div className="mm-field">
                <label htmlFor="mm-name">Full name</label>
                <input id="mm-name" className="mm-input" type="text" name="name" autoComplete="name" required placeholder="Your name" />
              </div>
              <div className="mm-field">
                <label htmlFor="mm-email">Email</label>
                <input id="mm-email" className="mm-input" type="email" name="email" autoComplete="email" required placeholder="you@example.com" />
              </div>
              <div className="mm-field">
                <label htmlFor="mm-exp">Experience level</label>
                <select id="mm-exp" className="mm-select" name="experience" defaultValue="">
                  <option value="" disabled>Select one…</option>
                  <option value="new">New to trading</option>
                  <option value="some">Some experience</option>
                  <option value="challenge">Running prop-firm challenges</option>
                  <option value="funded">Funded trader</option>
                </select>
              </div>
              <div className="mm-field">
                <label htmlFor="mm-goal">What are you working on?</label>
                <textarea id="mm-goal" className="mm-textarea" name="goal" placeholder="A sentence or two about your goals…" />
              </div>
              <button type="submit" className="mm-btn mm-btn-lg mm-btn-full mm-form-btn" disabled={submitting}>
                {submitting ? 'Sending…' : 'Apply now'}
              </button>
              {error && <p className="mm-form-err" role="alert">{error}</p>}
              <p className="mm-form-fine">Educational program · No payment required to apply.</p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER — dark */}
      <footer className="mm-footer">
        <div className="mm-wrap">
          <div className="mm-footer-top">
            <div className="mm-footer-brand">
              <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.svg" alt="Forex Passing" />
              <p className="mm-footer-tagline">
                Forex Passing — let us teach you about trading. Clear education on markets and
                prop-firm process. Transparent, honest, no hype.
              </p>
            </div>

            <div className="mm-footer-col">
              <span className="mm-footer-h">Quick links</span>
              <a href="#top">Home</a>
              <a href="#why">About Us</a>
              {/* The door to the offer page. `?__test=` only exists in dev builds,
                  so on production this has to be the real /meta route. */}
              <a href="/meta">Forex Passing Meta</a>
              <a href="#apply">Referral Program</a>
              <a href="#apply">Contact</a>
            </div>

            <div className="mm-footer-col">
              <span className="mm-footer-h">Contact</span>
              <a href="#apply">Apply to join the program</a>
              <a href="#apply">Ask a question</a>
            </div>
          </div>

          <hr className="mm-footer-rule" />

          <p className="mm-footer-legal">
            This material is for educational purposes only. It is not investment advice or a
            recommendation of any kind. Trading leveraged instruments carries a high risk of
            losing capital. Individual results; past performance does not guarantee future results.
          </p>
          <p className="mm-footer-copy">© {year} Forex Passing. All rights reserved.</p>
        </div>
      </footer>

      {/* Sticky CTA — mobile only */}
      <a href="#apply" className={`mm-sticky-cta${hideSticky ? ' is-hidden' : ''}`}>Get Started</a>
    </div>
  )
}

const CSS = `
.mm-root{
  --bg:#ffffff; --bg2:#f3f6fb; --line:rgba(15,23,42,.10);
  --txt:#0f172a; --mut:#5b6675; --blue:#2f6fe0; --blue-soft:#5ba4d9;
  --foot-bg:#0f1722; --foot-txt:#d7dee8; --foot-mut:#8893a3;
  background:var(--bg); color:var(--txt);
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.mm-root *{box-sizing:border-box;margin:0;padding:0}
.mm-wrap{max-width:1080px;margin:0 auto;padding:0 24px}

/* NAV */
.mm-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.mm-nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
.mm-logo{display:inline-flex;align-items:center;text-decoration:none}
.mm-logo-img{display:block;height:44px;width:auto}
.mm-logo-img-sm{height:36px}
.mm-nav-links{display:flex;gap:28px}
.mm-nav-links a{color:var(--txt);text-decoration:none;font-size:15px;font-weight:600;transition:color .15s}
.mm-nav-links a:hover{color:var(--blue)}

/* BUTTONS */
.mm-btn{display:inline-block;background:var(--blue);color:#ffffff;font-weight:700;text-decoration:none;
  border-radius:8px;padding:13px 22px;font-size:15px;border:1px solid var(--blue);cursor:pointer;
  transition:transform .12s ease, box-shadow .2s ease}
.mm-btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(47,111,224,.28)}
.mm-btn-lg{padding:15px 30px;font-size:15px}
.mm-btn-full{display:block;text-align:center;width:100%}
.mm-btn-ghost{background:#fff;color:var(--txt);border:1px solid rgba(15,23,42,.22);box-shadow:none}
.mm-btn-ghost:hover{border-color:var(--blue);color:var(--blue);box-shadow:none}

/* HEADINGS */
.mm-h1{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,8.2vw,84px);
  line-height:1;letter-spacing:.01em;text-transform:uppercase;margin:0 0 22px}
.mm-h2{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(28px,4.6vw,46px);
  line-height:1.04;text-transform:uppercase;letter-spacing:.01em;margin-bottom:18px}
.mm-center{text-align:center;margin-left:auto;margin-right:auto}
.mm-blue{color:var(--blue)}
.mm-lead{font-size:clamp(16px,2vw,18px);color:var(--mut);max-width:600px;line-height:1.6}
.mm-lead-mid{margin-left:auto;margin-right:auto}

/* HERO */
.mm-hero{position:relative;padding:84px 0 72px;text-align:center;overflow:hidden}
.mm-hero .mm-lead{margin:0 auto}
.mm-cta-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:34px 0 16px}
.mm-microtrust{font-size:12px;color:var(--mut);letter-spacing:.05em;text-transform:uppercase}
.mm-hero-glow{position:absolute;top:-220px;left:50%;transform:translateX(-50%);width:880px;height:560px;
  background:radial-gradient(closest-side,rgba(47,111,224,.12),transparent 70%);pointer-events:none;z-index:0}
.mm-hero .mm-wrap{position:relative;z-index:1}

/* STATS BAND */
.mm-stats{background:var(--blue);color:#fff}
.mm-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:42px 24px}
@media(max-width:680px){.mm-stats-grid{grid-template-columns:repeat(2,1fr);gap:28px 8px}}
.mm-stat{text-align:center}
.mm-stat-v{display:block;font-family:'Anton',sans-serif;font-size:clamp(34px,6vw,50px);line-height:1}
.mm-stat-k{display:block;font-size:13px;font-weight:600;letter-spacing:.04em;margin-top:6px;opacity:.92}

/* SECTIONS */
.mm-section{padding:80px 0}
@media(max-width:760px){.mm-section{padding:56px 0}}

/* WHY CHOOSE */
.mm-why-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:38px}
@media(max-width:900px){.mm-why-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.mm-why-grid{grid-template-columns:1fr}}
.mm-why-card{border:1px solid var(--line);border-radius:14px;padding:26px 24px;background:#fff;
  box-shadow:0 1px 2px rgba(15,23,42,.04);transition:border-color .15s,box-shadow .2s,transform .15s}
.mm-why-card:hover{border-color:rgba(47,111,224,.4);box-shadow:0 12px 30px rgba(15,23,42,.07);transform:translateY(-2px)}
.mm-why-ico{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:11px;
  background:rgba(47,111,224,.10);color:var(--blue);margin-bottom:18px}
.mm-why-ico svg{width:21px;height:21px}
.mm-why-t{display:block;font-family:'Anton',sans-serif;font-weight:400;font-size:19px;text-transform:uppercase;letter-spacing:.02em;margin-bottom:8px}
.mm-why-d{display:block;color:var(--mut);font-size:14px;line-height:1.6}

/* JOURNEY / APPLY */
.mm-journey{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:80px 0;text-align:center}
@media(max-width:760px){.mm-journey{padding:56px 0}}
.mm-form{max-width:560px;margin:36px auto 0;display:grid;gap:16px;text-align:left}
.mm-field{display:grid;gap:6px}
.mm-field label{font-size:13px;font-weight:600;color:var(--txt)}
.mm-input,.mm-select,.mm-textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:13px 14px;
  font-size:15px;font-family:inherit;background:#fff;color:var(--txt);transition:border-color .15s,box-shadow .15s}
.mm-input:focus,.mm-select:focus,.mm-textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(47,111,224,.15)}
.mm-textarea{min-height:110px;resize:vertical}
.mm-form-btn{margin-top:6px}
.mm-form-btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.mm-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}
.mm-form-err{font-size:13px;color:#c0392b;text-align:center;margin-top:2px}
.mm-form-fine{font-size:12px;color:var(--mut);text-align:center;margin-top:2px}
.mm-form-ok{max-width:560px;margin:36px auto 0;display:flex;flex-direction:column;align-items:center;gap:8px;
  border:1px solid rgba(47,111,224,.35);background:rgba(47,111,224,.05);border-radius:16px;padding:34px 26px}
.mm-form-ok-ico{width:46px;height:46px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.mm-form-ok-t{font-weight:800;font-size:18px}
.mm-form-ok-d{color:var(--mut);font-size:14px;text-align:center}

/* FOOTER — dark */
.mm-footer{background:var(--foot-bg);color:var(--foot-txt);padding:56px 0 36px}
.mm-footer-top{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:32px}
@media(max-width:760px){.mm-footer-top{grid-template-columns:1fr;gap:28px}}
.mm-footer-tagline{margin-top:14px;font-size:14px;color:var(--foot-mut);line-height:1.7;max-width:420px}
.mm-footer-col{display:flex;flex-direction:column;gap:10px}
.mm-footer-h{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#fff;margin-bottom:4px}
.mm-footer-col a{color:var(--foot-mut);text-decoration:none;font-size:14px;transition:color .15s}
.mm-footer-col a:hover{color:var(--blue-soft)}
.mm-footer-rule{border:none;border-top:1px solid rgba(255,255,255,.10);margin:34px 0 20px}
.mm-footer-legal{font-size:12px;color:var(--foot-mut);line-height:1.7;max-width:900px}
.mm-footer-copy{font-size:12px;color:var(--foot-mut);margin-top:16px}

/* STICKY CTA — mobile only */
.mm-sticky-cta{display:none}
.mm-sticky-cta.is-hidden{transform:translateY(130%);opacity:0;pointer-events:none}
@media(max-width:760px){
  .mm-root{padding-bottom:calc(70px + env(safe-area-inset-bottom))}
  .mm-sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:60;display:block;text-align:center;
    background:var(--blue);color:#fff;font-weight:800;text-decoration:none;font-size:16px;
    padding:18px 16px;padding-bottom:max(18px,env(safe-area-inset-bottom));
    letter-spacing:.01em;box-shadow:0 -8px 30px rgba(15,23,42,.18);
    transition:transform .3s cubic-bezier(.22,.61,.36,1),opacity .3s cubic-bezier(.22,.61,.36,1)}
}
`
