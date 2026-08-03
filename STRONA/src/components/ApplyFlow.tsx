// Forex Passing — the application questionnaire, and the modal that holds it.
//
// One flow, used by the offer page and by the Google Ads lander. The question
// set lives in ../data/questionnaire.ts; this file is only the machinery:
// progress, back/forward, the disqualification exit, and the submit.
//
// Disqualifying answers stop the flow immediately and show the "not a fit"
// screen — no lead is sent. That is deliberate: a questionnaire that filters
// but still submits everybody is just a longer form.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { APPLY_ENDPOINT, CONTACT_EMAIL, TELEGRAM_HREF } from '../constants'
import {
  INCOME_QUESTION,
  PRE_CONTACT,
  QUALIFICATION,
  TOTAL_STEPS,
  type Step,
} from '../data/questionnaire'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackCustom', fbEvent, params)
  else window.fbq?.('track', fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
// Telegram allows 5–32 chars: letters, digits and underscores. A leading @ is
// optional because people type it both ways.
const TELEGRAM_RE = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/

/** Partner slug parked by the /r/<slug> redirect, if any. */
function readRef(): string {
  try {
    return window.localStorage.getItem('fp_ref') ?? ''
  } catch {
    return ''
  }
}

type Contact = { name: string; email: string; phone: string; telegram: string; company: string }

const EMPTY_CONTACT: Contact = { name: '', email: '', phone: '', telegram: '', company: '' }

const STEPS: (Step | 'contact')[] = [...PRE_CONTACT, 'contact', ...QUALIFICATION]

export function ApplyFlow({ initialName = '', source }: { initialName?: string; source: string }) {
  const [index, setIndex] = useState(0)
  const [contact, setContact] = useState<Contact>({ ...EMPTY_CONTACT, name: initialName })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [outcome, setOutcome] = useState<'open' | 'sent' | 'rejected'>('open')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // The panel is what scrolls, not the page. Leaving its scrollTop alone means
  // a step reached from a long one opens halfway down its own question.
  useEffect(() => {
    rootRef.current?.closest('.mm-modal-card')?.scrollTo({ top: 0 })
  }, [index, outcome])

  const markStarted = () => {
    if (started.current) return
    started.current = true
    track('ApplyStart', 'form_start', { source }, true)
  }

  const step = STEPS[index]
  const pct = Math.round(((index + 1) / TOTAL_STEPS) * 100)

  const advance = () => {
    setError('')
    setIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  const back = () => {
    setError('')
    setIndex((i) => Math.max(i - 1, 0))
  }

  const answer = (question: string, option: { label: string; qualified: boolean }) => {
    markStarted()
    setAnswers((a) => ({ ...a, [question]: option.label }))
    if (!option.qualified) {
      track('ApplyDisqualified', 'form_disqualified', { source, question }, true)
      // Recorded and emailed, but only once we actually have an address: the
      // first question is asked before the contact step, so someone who fails
      // it is anonymous and there is nobody to write to. No `Lead` event
      // either — a rejection is not a conversion and must not train the ad
      // platform.
      if (EMAIL_RE.test(contact.email.trim())) {
        void submit({ ...answers, [question]: option.label }, 'not_qualified')
      }
      setOutcome('rejected')
      return
    }
    if (index === STEPS.length - 1) void submit({ ...answers, [question]: option.label })
    else advance()
  }

  const submit = async (
    finalAnswers: Record<string, string>,
    result: 'qualified' | 'not_qualified' = 'qualified'
  ) => {
    if (sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(APPLY_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          telegram: contact.telegram.trim(),
          company: contact.company,
          answers: finalAnswers,
          income: finalAnswers[INCOME_QUESTION] ?? '',
          outcome: result,
          source,
          ref: readRef(),
        }),
      })
      if (!res.ok) throw new Error('request failed')
      if (result === 'not_qualified') return
      setOutcome('sent')
      track('Lead', 'generate_lead', { source })
    } catch {
      // A failed send on the rejection path is silent: that person is already
      // looking at the "not a fit" screen and has nothing to retry.
      if (result === 'qualified') setError('We could not send that. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  if (outcome === 'sent') {
    return (
      <div className="mm-form-ok" role="status">
        <span className="mm-form-ok-ico" aria-hidden="true">✓</span>
        <span className="mm-form-ok-t">Application received</span>
        <span className="mm-form-ok-d">
          We usually reply within one business day. Nothing has been charged. We check your firm's
          rules first, then talk, then put the agreement in writing.
        </span>
        <span className="mm-form-ok-d">
          If you want to talk sooner, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </span>
      </div>
    )
  }

  if (outcome === 'rejected') {
    return (
      <div className="mm-form-ok mm-form-no" role="status">
        <span className="mm-form-ok-ico mm-form-no-ico" aria-hidden="true">✕</span>
        <span className="mm-form-ok-t">This doesn't look like a fit right now</span>
        <span className="mm-form-ok-d">
          Based on your answers we would not take this on today. Better to say so than to take your
          time. Nothing has been submitted.
        </span>
        <span className="mm-form-ok-d">
          If you think we have the wrong picture, or your situation changes, message us on Telegram
          and we will look again.
        </span>
        <a
          href={TELEGRAM_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="mm-btn mm-btn-lg"
          style={{ marginTop: 6 }}
        >
          Message us on Telegram
        </a>
      </div>
    )
  }

  return (
    <div className="mm-qflow" ref={rootRef}>
      <div className="mm-qflow-head">
        <span>Step {index + 1} of {TOTAL_STEPS}</span>
        <span>{pct}%</span>
      </div>
      <div className="mm-qflow-track"><div className="mm-qflow-fill" style={{ width: `${pct}%` }} /></div>

      {step === 'contact' ? (
        <ContactStep
          value={contact}
          onChange={setContact}
          onNext={() => {
            markStarted()
            advance()
          }}
          onBack={index > 0 ? back : undefined}
          setError={setError}
        />
      ) : step.kind === 'question' ? (
        <QuestionStep key={index} step={step} onAnswer={answer} onBack={index > 0 ? back : undefined} />
      ) : (
        <InfoStep
          key={index}
          step={step}
          onContinue={() => {
            markStarted()
            if (step.completeOnContinue) void submit(answers)
            else advance()
          }}
          onBack={index > 0 ? back : undefined}
          busy={sending}
        />
      )}

      {error && <p className="mm-form-err" role="alert">{error}</p>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function StepShell({
  title,
  description,
  question,
  children,
  onBack,
}: {
  title?: string
  description?: string
  question?: string
  children: ReactNode
  onBack?: () => void
}) {
  return (
    <div className="mm-qflow-body">
      {title && <span className="mm-qflow-kicker">{title}</span>}
      {question && <p className="mm-qflow-question">{question}</p>}
      {description && <p className="mm-qflow-desc">{description}</p>}
      {children}
      {onBack && (
        <button type="button" className="mm-qflow-back" onClick={onBack}>← Back</button>
      )}
    </div>
  )
}

function QuestionStep({
  step,
  onAnswer,
  onBack,
}: {
  step: Extract<Step, { kind: 'question' }>
  onAnswer: (question: string, option: { label: string; qualified: boolean }) => void
  onBack?: () => void
}) {
  return (
    <StepShell title={step.title} description={step.description} question={step.question} onBack={onBack}>
      <div className="mm-qflow-opts">
        {step.options.map((o) => (
          <button
            type="button"
            className="mm-choice"
            key={o.label}
            onClick={() => onAnswer(step.question, o)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </StepShell>
  )
}

function InfoStep({
  step,
  onContinue,
  onBack,
  busy,
}: {
  step: Extract<Step, { kind: 'info' }>
  onContinue: () => void
  onBack?: () => void
  busy: boolean
}) {
  return (
    <StepShell title={step.title} onBack={onBack}>
      {step.body && <p className="mm-qflow-desc">{step.body}</p>}

      {step.detailRows && (
        <dl className="mm-qflow-rows">
          {step.detailRows.map(([k, v]) => (
            <div className="mm-qflow-row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {step.bullets && (
        <ul
          className={`mm-qflow-bullets${step.template === 'contract' ? ' is-contract' : ''}${
            step.template === 'team' ? ' is-team' : ''
          }`}
        >
          {step.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {step.note && <p className="mm-qflow-note">{step.note}</p>}

      <button type="button" className="mm-btn mm-btn-lg mm-btn-full" onClick={onContinue} disabled={busy}>
        {busy ? 'Sending…' : (step.continueLabel ?? 'Continue')}
      </button>
    </StepShell>
  )
}

function ContactStep({
  value,
  onChange,
  onNext,
  onBack,
  setError,
}: {
  value: Contact
  onChange: (c: Contact) => void
  onNext: () => void
  onBack?: () => void
  setError: (s: string) => void
}) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => onChange({ ...value, [k]: v })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.name.trim()) return setError('Please add your name.')
    if (!EMAIL_RE.test(value.email.trim())) return setError('Please add a valid email address.')
    // Onboarding runs on Telegram, so the handle is not optional — asking for it
    // here beats chasing it after someone has already been accepted.
    if (!TELEGRAM_RE.test(value.telegram.trim())) {
      return setError('Please add your Telegram handle. That is where we reply.')
    }
    onNext()
  }

  return (
    <form className="mm-qflow-body" onSubmit={submit} noValidate>
      <span className="mm-qflow-kicker">Your details</span>
      <p className="mm-qflow-question">Where should we reply?</p>
      <p className="mm-qflow-desc">
        Only used to answer this application. Nothing is charged and nothing is shared.
      </p>

      {/* Honeypot — real people never see this. Filled = bot, dropped server-side. */}
      <input
        className="mm-hp"
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={value.company}
        onChange={(e) => set('company', e.target.value)}
      />

      <div className="mm-field">
        <label htmlFor="af-name">Full name</label>
        <input id="af-name" className="mm-input" type="text" autoComplete="name" placeholder="John Example"
          value={value.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div className="mm-field">
        <label htmlFor="af-email">Email</label>
        <input id="af-email" className="mm-input" type="email" autoComplete="email" placeholder="you@email.com"
          value={value.email} onChange={(e) => set('email', e.target.value)} required />
      </div>
      <div className="mm-field">
        <label htmlFor="af-phone">Phone <span className="mm-opt-label">(optional)</span></label>
        <input id="af-phone" className="mm-input" type="tel" autoComplete="tel" placeholder="+44 7123 456789"
          value={value.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div className="mm-field">
        <label htmlFor="af-tg">Telegram</label>
        <input id="af-tg" className="mm-input" type="text" placeholder="@yourhandle" required
          value={value.telegram} onChange={(e) => set('telegram', e.target.value)} />
        <span className="mm-field-hint">Onboarding and support run on Telegram. This is where we reply.</span>
      </div>

      <button type="submit" className="mm-btn mm-btn-lg mm-btn-full">Continue</button>
      {onBack && <button type="button" className="mm-qflow-back" onClick={onBack}>← Back</button>}
    </form>
  )
}

/* -------------------------------------------------------------------------- */

/** Modal wrapper. Escape and a backdrop click close it; the page behind stops scrolling. */
export function ApplyModal({
  initialName,
  source,
  onClose,
}: {
  initialName: string
  source: string
  onClose: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.querySelector<HTMLElement>('input,button,select,textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Rendered on <body>: a transformed ancestor (any .mm-reveal section) would
  // otherwise become the containing block for position:fixed and the window
  // would open wherever that section happens to sit on the page.
  return createPortal(
    <div
      className="mm-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Application"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mm-modal-card" ref={cardRef}>
        <button type="button" className="mm-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="mm-modal-body">
          <ApplyFlow initialName={initialName} source={source} />
        </div>
      </div>
    </div>,
    document.body
  )
}
