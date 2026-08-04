// Forex Passing — /partner-portal (and /affiliate, which renders the same thing).
//
// Signed out: sign in or create a partner account. Signed up, we also insert the
// partners row, because the slug is what makes the referral link work.
// Signed in: tier, progress, the tracked link, and the referral ledger.
//
// If Supabase is not configured the page says so instead of throwing — the rest
// of the site must keep working whether or not the portal has been set up.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { CONTACT_EMAIL, telegramWith } from '../constants'
import {
  fetchReferrals,
  fetchStats,
  PORTAL_ENABLED,
  referralUrl,
  SLUG_RE,
  slugify,
  supabase,
  type PartnerStats,
  type Referral,
} from '../runtime/supabase'
import { SiteFooter, track, useReveal } from './shared'

type Mode = 'signin' | 'signup'

export function PartnerPortal() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: 'Partner portal' })
    if (!supabase) {
      setReady(true)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session))
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="mm-root mm-root-sub" ref={rootRef}>

      <div className="mm-topbar mm-topbar-split">
        <a href="/referral-program" className="mm-logo">
          <img className="mm-logo-img" src="/logo.webp" alt="Forex Passing" />
        </a>
        <a href="/referral-program" className="mm-btn mm-btn-ghost mm-btn-sm mm-topbar-login">
          Programme
        </a>
      </div>

      <header className="mm-sub-hero">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">Partner programme · Open</span>
          <h1 className="mm-sub-h1">Partner portal</h1>
          <p className="mm-lead mm-center">
            Your tracked link, your referrals and your tier progress, all in one place.
          </p>
        </div>
      </header>

      <section className="mm-section">
        <div className="mm-wrap">
          {!PORTAL_ENABLED ? (
            <NotConfigured />
          ) : !ready ? (
            <p className="mm-disclaimer">Loading…</p>
          ) : signedIn ? (
            <Dashboard />
          ) : (
            <AuthCard />
          )}
        </div>
      </section>

      <SiteFooter variant="referral" />
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="mm-doc" style={{ textAlign: 'center' }}>
      <h3>The portal isn't switched on yet</h3>
      <p>
        Partner accounts are not accepting sign-ups on this deployment. Message us on{' '}
        <a
          href={telegramWith(
            'The partner portal is not open for sign-ups yet. Can you set up my partner account by hand?',
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </a>{' '}
        or write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will set you up by hand in
        the meantime.
      </p>
    </div>
  )
}

/* --------------------------------------------------------------------------
 * Sign in / create account
 * ------------------------------------------------------------------------ */

function AuthCard() {
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        return
      }

      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) throw err

      // No session means the project requires email confirmation; the partners
      // row has to wait until they are actually signed in.
      if (!data.session) {
        setNotice('Check your inbox to confirm the address, then sign in here.')
        setMode('signin')
        return
      }

      const created = await createPartnerRow(name || email.split('@')[0])
      if (created) track('PartnerSignup', 'sign_up', { method: 'password' }, true)
      else setError('Account created, but the partner profile could not be saved. Try reloading.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mm-authcard">
      <div className="mm-authtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={mode === 'signup' ? 'is-on' : ''}
          onClick={() => setMode('signup')}
        >
          Create account
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={mode === 'signin' ? 'is-on' : ''}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
      </div>

      <form className="mm-form" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="mm-field">
            <label htmlFor="pp-name">Display name</label>
            <input
              id="pp-name"
              className="mm-input"
              type="text"
              autoComplete="name"
              placeholder="John Example"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="mm-field">
          <label htmlFor="pp-email">Email</label>
          <input
            id="pp-email"
            className="mm-input"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mm-field">
          <label htmlFor="pp-pass">Password</label>
          <input
            id="pp-pass"
            className="mm-input"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="mm-btn mm-btn-lg mm-btn-full" disabled={busy}>
          {busy ? 'Working…' : mode === 'signup' ? 'Open partner account' : 'Sign in'}
        </button>

        {error && <p className="mm-form-err" role="alert">{error}</p>}
        {notice && <p className="mm-form-note" role="status">{notice}</p>}
        <p className="mm-form-fine">
          Nothing is charged. A partner account only tracks referrals. It is not a trading account.
        </p>
      </form>
    </div>
  )
}

/** Creates the partners row, retrying the slug until one is free. */
async function createPartnerRow(displayName: string): Promise<boolean> {
  if (!supabase) return false
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) return false

  const base = slugify(displayName) || 'partner'
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    if (!SLUG_RE.test(slug)) continue
    const { error } = await supabase
      .from('partners')
      .insert({ id, display_name: displayName.slice(0, 60), slug })
    if (!error) return true
    // 23505 = unique violation; anything else is a real failure.
    if (error.code !== '23505') return false
  }
  return false
}

/* --------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------ */

function Dashboard() {
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([fetchStats(), fetchReferrals()])
    setStats(s)
    setReferrals(r)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  if (loading) return <p className="mm-disclaimer">Loading your numbers…</p>

  if (!stats) {
    // Signed in but no partners row — e.g. the insert failed at sign-up.
    return <FinishSetup onDone={reload} />
  }

  const target = stats.next_tier === 'Platinum' ? 5 : stats.next_tier === 'Premium' ? 2 : 5
  const pct = Math.min(100, Math.round((stats.confirmed / target) * 100))
  const link = referralUrl(stats.slug)

  return (
    <div className="mm-dash">
      <div className="mm-dash-head">
        <div>
          <span className="mm-dash-hello">Signed in as {stats.display_name}</span>
          <h2 className="mm-dash-tier">{stats.tier} partner</h2>
        </div>
        <button type="button" className="mm-btn mm-btn-ghost mm-btn-sm" onClick={() => supabase?.auth.signOut()}>
          Sign out
        </button>
      </div>

      <div className="mm-pcard">
        <div className="mm-pcard-head">
          <span className="mm-pcard-title">Partner portal · {stats.tier}</span>
          <span className="mm-pcard-badge">● Live</span>
        </div>

        <div className="mm-pcard-stats">
          <div><span className="mm-pcard-v">{stats.clicks}</span><span className="mm-pcard-k">Clicks</span></div>
          <div><span className="mm-pcard-v">{stats.confirmed}</span><span className="mm-pcard-k">Confirmed</span></div>
          <div><span className="mm-pcard-v">{stats.pending}</span><span className="mm-pcard-k">Pending</span></div>
        </div>

        <div className="mm-pcard-link">
          <span>{link}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`https://${link}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mm-pcard-progress">
          <div className="mm-pcard-progress-head">
            <span>Tier progress</span>
            <span>{stats.confirmed} / {target}</span>
          </div>
          <div className="mm-pcard-track"><div className="mm-pcard-fill" style={{ width: `${pct}%` }} /></div>
          <span className="mm-pcard-note">
            {stats.next_tier
              ? `${stats.to_next_tier} more confirmed referral${stats.to_next_tier === 1 ? '' : 's'} to unlock ${stats.next_tier}.`
              : 'Top tier reached. Everything below stays yours.'}
          </span>
        </div>
      </div>

      <AddReferral onAdded={reload} />

      <div className="mm-dash-block">
        <h3 className="mm-dash-h3">Your referrals</h3>
        {referrals.length === 0 ? (
          <p className="mm-disclaimer" style={{ textAlign: 'left' }}>
            No referrals yet. Share your link above, or add someone you have already spoken to.
          </p>
        ) : (
          <table className="mm-dash-table">
            <thead>
              <tr><th>Email</th><th>Account size</th><th>Status</th><th>Added</th></tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{r.account_size || '–'}</td>
                  <td><span className={`mm-pill mm-pill-${r.status}`}>{r.status}</span></td>
                  <td>{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mm-form-fine" style={{ textAlign: 'left' }}>
          A referral turns <strong>confirmed</strong> once the prop firm has actually released a
          payout to them. We set that by hand, so the number always matches money that moved.
        </p>
      </div>
    </div>
  )
}

function FinishSetup({ onDone }: { onDone: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <form
      className="mm-authcard"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        const ok = await createPartnerRow(name)
        if (ok) await onDone()
        else setError('That name could not be saved. Try a different one.')
        setBusy(false)
      }}
    >
      <h3 className="mm-dash-h3">One more step</h3>
      <p className="mm-form-fine" style={{ textAlign: 'left', marginBottom: 14 }}>
        Pick the name your referral link is built from.
      </p>
      <div className="mm-field">
        <label htmlFor="pp-setup">Display name</label>
        <input
          id="pp-setup"
          className="mm-input"
          type="text"
          placeholder="John Example"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="mm-btn mm-btn-lg mm-btn-full" disabled={busy}>
        {busy ? 'Saving…' : 'Finish setup'}
      </button>
      {error && <p className="mm-form-err" role="alert">{error}</p>}
    </form>
  )
}

function AddReferral({ onAdded }: { onAdded: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [size, setSize] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <form
      className="mm-dash-block"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!supabase || busy) return
        setBusy(true)
        setError('')
        const { data: u } = await supabase.auth.getUser()
        const { error: err } = await supabase
          .from('referrals')
          .insert({ partner_id: u.user?.id, email: email.trim(), account_size: size.trim() || null })
        if (err) setError(err.message)
        else {
          setEmail('')
          setSize('')
          await onAdded()
        }
        setBusy(false)
      }}
    >
      <h3 className="mm-dash-h3">Add a referral</h3>
      <div className="mm-dash-row">
        <input
          className="mm-input"
          type="email"
          placeholder="referral@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Referral email"
        />
        <input
          className="mm-input"
          type="text"
          placeholder="Account size, e.g. $50K"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          aria-label="Account size"
        />
        <button type="submit" className="mm-btn mm-btn-lg" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="mm-form-err" role="alert">{error}</p>}
    </form>
  )
}
