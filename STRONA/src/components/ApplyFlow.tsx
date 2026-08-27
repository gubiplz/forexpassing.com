// Forex Passing — the application questionnaire, and the modal that holds it.
//
// One flow, used by the offer page and by the Google Ads lander. The question
// set lives in ../data/questionnaire.ts; this file is only the machinery:
// progress, back/forward, the disqualification exit, and the submit.
//
// Disqualifying answers stop the flow immediately and show the "not a fit"
// screen — no lead is sent. That is deliberate: a questionnaire that filters
// but still submits everybody is just a longer form.

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  APPLY_ENDPOINT,
  CONTACT_EMAIL,
  FREE_CHALLENGE_SIZE,
  FREE_TELEGRAM_HREF,
  TELEGRAM_HREF,
  THANK_YOU_HREF,
  telegramWith,
} from '../constants'
import {
  FREE_PRE_CONTACT,
  FREE_QUALIFICATION,
  PRE_CONTACT,
  QUALIFICATION,
  type Step,
} from '../data/questionnaire'
import {
  DIAL_CODES, detectIso, findDial, flagSrc, nationalDigits, normalizeTelegram,
  samplePlaceholder, splitDial, TELEGRAM_RE,
} from '../data/dial-codes'
import { track } from '../lib/track'

// Local part, one @, a dotted domain, and a TLD of at least two letters. Stops
// the two mistakes that actually arrive: a handle with no @ at all, and
// "name@gmail" with the .com left off.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/
// A person's name carries no digits. Letters from any alphabet, plus the marks
// that live inside real names: spaces, hyphens, apostrophes and full stops.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u
// The Telegram handle shape and the phone length table live in
// src/lib/phone-rules.js — the same rules the server-side grader reads, so the
// form and the channel post can never disagree about the same entry.

/** Partner slug parked by the /r/<slug> redirect, if any. */
function readRef(): string {
  try {
    return window.localStorage.getItem('fp_ref') ?? ''
  } catch {
    return ''
  }
}

// Jeden identyfikator na WYPEŁNIENIE formularza, nie na kliknięcie „wyślij".
// Ponowna wysyłka po zerwanej sieci niesie ten sam, więc serwer rozpozna to samo
// zgłoszenie zamiast założyć drugiego leada — bez tego automatyczne ponowienie
// niżej byłoby fabryką dubli, a nie zabezpieczeniem.
//
// crypto.randomUUID() wymaga bezpiecznego kontekstu i nie ma go w Safari
// starszym niż 15.4. Formularz nie może paść przez klucz idempotencji, więc przy
// jego braku idą losowe znaki: to nie musi być UUID, musi być niepowtarzalne.
function newSubmissionId(): string {
  try {
    if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // Poniżej.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'ttclid',
  'gclid',
]
const ATTRIBUTION_STORE = 'fp_attr'

/**
 * Z której reklamy przyszedł ten człowiek.
 *
 * Zapamiętywane przy pierwszym kontakcie z parametrami, bo do formularza
 * dochodzi się kilkoma kliknięciami i do wysyłki zdążą zniknąć z adresu. Bez
 * tego raport odpowiada „ilu ich było", a nie „która kampania je przyniosła".
 *
 * Pierwsze wejście wygrywa nad późniejszym: klik w reklamę przyniósł parametry,
 * a przeładowanie strony bez nich nie ma prawa ich skasować.
 */
function readAttribution(): Record<string, string> {
  let zapisane: Record<string, string> = {}
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_STORE) ?? '{}')
    if (raw && typeof raw === 'object') zapisane = raw as Record<string, string>
  } catch {
    // Prywatne okno albo śmieci w magazynie — atrybucja jest miła, nie wymagana.
  }
  const q = new URLSearchParams(window.location.search)
  const zAdresu = Object.fromEntries(
    ATTRIBUTION_KEYS.map((k) => [k, (q.get(k) ?? '').trim().slice(0, 200)]).filter(([, v]) => v)
  )
  const all = { ...zAdresu, ...zapisane }
  try {
    if (Object.keys(all).length) window.sessionStorage.setItem(ATTRIBUTION_STORE, JSON.stringify(all))
  } catch {
    // Jak wyżej.
  }
  return all
}

// Zerwana sieć i zimny start funkcji to jedyne dwie awarie, które ta wysyłka
// realnie widzi, i obie mijają w sekundę.
const RETRY_MS = 1500

/**
 * Wysyłka z jedną automatyczną próbą więcej.
 *
 * Dotąd jedyną obroną przed chwilową awarią było to, że człowiekowi będzie się
 * chciało kliknąć drugi raz — czyli lead ginął wtedy, kiedy nie chciało się
 * nikomu. Ponowienie jest bezpieczne, bo `submission_id` w treści jest ten sam.
 * Kod 4xx nie jest ponawiany: literówka w mailu nie naprawi się sama.
 */
async function postLead(body: string): Promise<Response> {
  const raz = () =>
    fetch(APPLY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
  try {
    const res = await raz()
    if (res.ok || res.status < 500) return res
  } catch {
    // Sieć padła w locie — dokładnie ten przypadek, dla którego to tu jest.
  }
  await new Promise((r) => window.setTimeout(r, RETRY_MS))
  return raz()
}

// `phone` holds the national part only; `phoneIso` picks the dialling code in
// front of it. They are joined into one +.. number at submit time, so the team
// never has to guess which country a bare nine-digit number belongs to.
type Contact = {
  name: string
  email: string
  phone: string
  phoneIso: string
  telegram: string
  referralNote: string
}

const EMPTY_CONTACT: Contact = {
  name: '',
  email: '',
  phone: '',
  // Blank on purpose: nothing is preselected, the visitor picks.
  phoneIso: '',
  telegram: '',
  referralNote: '',
}

const PAID_STEPS: (Step | 'contact')[] = [...PRE_CONTACT, 'contact', ...QUALIFICATION]
const FREE_STEPS: (Step | 'contact')[] = [...FREE_PRE_CONTACT, 'contact', ...FREE_QUALIFICATION]

// Closing the panel unmounts the flow, and a questionnaire that forgets a
// typed-in email because someone tapped outside the window is a lead lost for
// no reason. sessionStorage keeps it for the tab only, and it is cleared the
// moment the application is sent or turned down.
//
// One key per funnel: the two ask different questions in different orders, so a
// paid-funnel draft restored into the shorter free one would reopen at a step
// that is not there, carrying answers to questions it never asks.
const draftKey = (fromFree: boolean) => (fromFree ? 'fp_apply_draft_free' : 'fp_apply_draft')

type Draft = { index: number; contact: Contact; answers: Record<string, string> }

function readDraft(key: string, stepCount: number): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    if (typeof d?.index !== 'number' || !d.contact || !d.answers) return null
    // A stored index from an older question set would land past the end and
    // render an empty panel.
    return { ...d, index: Math.max(0, Math.min(d.index, stepCount - 1)) }
  } catch {
    return null
  }
}

export function ApplyFlow({
  initialName = '',
  source,
  onDirty,
}: {
  initialName?: string
  source: string
  onDirty?: () => void
}) {
  // The /freeaccount lander opens this flow with source "free". It gets its own
  // shorter question set, its own draft, and its own Telegram address.
  const fromFree = source === 'free'
  const steps = fromFree ? FREE_STEPS : PAID_STEPS
  const totalSteps = steps.length

  const [restored] = useState(() => readDraft(draftKey(fromFree), totalSteps))
  const [index, setIndex] = useState(() => restored?.index ?? 0)
  const [contact, setContact] = useState<Contact>(() =>
    // The dialling code starts on the visitor's own country, worked out from the
    // device's time zone. On a restored draft it is only filled when still
    // blank: a country the visitor picked themselves, or a draft written before
    // the picker existed, must never be overwritten by a guess.
    restored?.contact
      ? { ...EMPTY_CONTACT, ...restored.contact, phoneIso: restored.contact.phoneIso || detectIso() }
      : { ...EMPTY_CONTACT, name: initialName, phoneIso: detectIso() }
  )
  const [answers, setAnswers] = useState<Record<string, string>>(() => restored?.answers ?? {})
  const [outcome, setOutcome] = useState<'open' | 'sent' | 'rejected' | 'leaving'>('open')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // A restored draft means ApplyStart already fired in the earlier visit.
  const started = useRef(restored !== null)
  const rootRef = useRef<HTMLDivElement>(null)
  // For the server's time trap: a human needs seconds to walk the steps, a
  // script posts instantly. Counted from mount, sent as elapsed_ms.
  const openedAt = useRef(Date.now())
  // Stały przez całe życie tego formularza — patrz newSubmissionId().
  const submissionId = useRef(newSubmissionId())

  // Free-account applicants are answered from a different Telegram account, and
  // the opener they arrive with tells the desk which offer they came for
  // without anyone opening the CRM.
  const telegramHref = fromFree ? FREE_TELEGRAM_HREF : TELEGRAM_HREF
  const sentMessage = fromFree
    ? `Hi — I just applied for the FREE ${FREE_CHALLENGE_SIZE} funded account from your free-account page. I am ready to get started, what happens next?`
    : 'I have just sent my application. I am ready to get funded and start earning payouts. What happens next?'
  const rejectedMessage = fromFree
    ? `Hi — I filled in the application for your FREE ${FREE_CHALLENGE_SIZE} account offer and it came back as not a fit. Can you take another look?`
    : 'I filled in the application and it came back as not a fit. Can you take another look?'

  useEffect(() => {
    if (restored) onDirty?.()
  }, [restored, onDirty])

  // Parametry kampanii chwytane przy otwarciu formularza, a nie dopiero przy
  // wysyłce: między jednym a drugim mieści się przeładowanie strony, po którym
  // adres jest już czysty.
  useEffect(() => {
    readAttribution()
  }, [])

  useEffect(() => {
    try {
      if (outcome === 'open') {
        window.sessionStorage.setItem(draftKey(fromFree), JSON.stringify({ index, contact, answers }))
      } else {
        window.sessionStorage.removeItem(draftKey(fromFree))
      }
    } catch {
      // Private mode and quota errors: the draft is a convenience, not a
      // requirement, so losing it must not break the form.
    }
  }, [index, contact, answers, outcome, fromFree])

  // The panel is what scrolls, not the page. Leaving its scrollTop alone means
  // a step reached from a long one opens halfway down its own question.
  useEffect(() => {
    rootRef.current?.closest('.mm-modal-card')?.scrollTo({ top: 0 })
  }, [index, outcome])

  const markStarted = () => {
    onDirty?.()
    if (started.current) return
    started.current = true
    track('ApplyStart', 'form_start', { source }, true)
  }

  const step = steps[index]
  const pct = Math.round(((index + 1) / totalSteps) * 100)

  const advance = () => {
    setError('')
    setIndex((i) => Math.min(i + 1, totalSteps - 1))
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
    if (index === totalSteps - 1) void submit({ ...answers, [question]: option.label })
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
      const res = await postLead(
        JSON.stringify({
          submission_id: submissionId.current,
          name: contact.name.trim(),
          email: contact.email.trim(),
          // Sent as one dialable number, not a bare national part the team
          // would have to work out the country of. When no country is set the
          // digits go as typed and the channel post says so.
          phone: nationalDigits(contact.phone, contact.phoneIso)
            ? `${findDial(contact.phoneIso)?.dial ?? ''} ${nationalDigits(contact.phone, contact.phoneIso)}`.trim()
            : '',
          // Sent alongside, because "is this number the right length" can only
          // be answered against a country, and the composed string above has
          // already lost which one it was.
          phoneIso: contact.phoneIso,
          telegram: contact.telegram.trim(),
          referral_note: contact.referralNote,
          elapsed_ms: Date.now() - openedAt.current,
          answers: finalAnswers,
          outcome: result,
          source,
          ref: readRef(),
          attribution: readAttribution(),
        })
      )
      if (!res.ok) throw new Error('request failed')
      // The grade is worked out server-side and comes back as a single flag.
      // An older deploy, or the Worker fallback, answers without it — then this
      // is undefined and nobody is sent anywhere, which is the safe default.
      const data = (await res.json().catch(() => ({}))) as { hq?: boolean }
      if (result === 'not_qualified') return

      // Accepted applicants are leaving for /thank-you, so they must NOT see the
      // confirmation card on the way out: it names Telegram and offers a button,
      // and flashing that for a few hundred milliseconds before the page changes
      // reads as a glitch. They get a quiet holding state instead.
      //
      // The pixel still fires before the jump — a redirect in the same tick can
      // cut the beacon off mid-flight.
      if (data.hq) {
        setOutcome('leaving')
        track('Lead', 'generate_lead', { source })
        // Carry the origin across the handoff so /thank-you can mark its Telegram
        // opener the same way the in-modal cards do. The paid funnel tags itself
        // too, even though there is nothing to choose between: /thank-you is a
        // public URL, and this parameter is the only thing telling an accepted
        // applicant apart from someone who typed the address. The two get sent to
        // different places.
        window.location.assign(`${THANK_YOU_HREF}?src=${fromFree ? 'free' : 'apply'}`)
        // If the browser refuses the jump — some in-app webviews do — fall back
        // to the normal confirmation rather than leaving them on a spinner.
        window.setTimeout(() => setOutcome('sent'), 2500)
        return
      }

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

  if (outcome === 'leaving') {
    return (
      <div className="mm-form-wait" role="status" aria-live="polite">
        <span className="mm-form-wait-spin" aria-hidden="true" />
        <span className="mm-form-wait-t">Application accepted</span>
        <span className="mm-form-wait-d">Taking you to your next step…</span>
      </div>
    )
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
        {/* The last step tells them to message us, so the button has to be here
            rather than an address they are expected to copy out by hand. */}
        <span className="mm-form-ok-d">
          Message us now and we pick it up sooner, or write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </span>
        <a
          href={telegramWith(sentMessage, telegramHref)}
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
          href={telegramWith(rejectedMessage, telegramHref)}
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
        <span>Step {index + 1} of {totalSteps}</span>
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

type FieldKey = 'name' | 'email' | 'phone' | 'telegram'

const FIELD_ORDER: FieldKey[] = ['name', 'email', 'phone', 'telegram']

function ContactStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: Contact
  onChange: (c: Contact) => void
  onNext: () => void
  onBack?: () => void
}) {
  // Per field rather than one message at the foot of the panel: with four
  // inputs and a scrolling card, a single line saying "add a valid email"
  // can sit off screen, below a button the reader is already looking at.
  const [errs, setErrs] = useState<Partial<Record<FieldKey, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => {
    onChange({ ...value, [k]: v })
    // Leaving the message under a field the reader is already correcting just
    // makes them read it twice.
    setErrs((e) => {
      if (!(k in e)) return e
      const next = { ...e }
      delete next[k as FieldKey]
      return next
    })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Partial<Record<FieldKey, string>> = {}

    const name = value.name.trim()
    if (!name) next.name = 'Please add your name.'
    else if (/\d/.test(name)) next.name = 'A name has no numbers in it. Please write it as it reads.'
    else if (!NAME_RE.test(name)) next.name = 'Please use letters only, as your name is written.'
    else if (name.length < 2) next.name = 'That looks too short to be a name.'

    const email = value.email.trim()
    if (!email) next.email = 'Please add your email address.'
    else if (!email.includes('@')) next.email = 'An email address needs an @ in it.'
    else if (!EMAIL_RE.test(email)) next.email = 'That address is not complete. Check the part after the @.'

    // Both contact channels are required now — the desk works leads over the
    // phone and Telegram, and a lead with neither cannot be worked at all.
    // The rules come from src/lib/phone-rules.js, the same table the grader
    // reads, so a number the form accepts never gets marked down in the post.
    const digits = nationalDigits(value.phone, value.phoneIso)
    if (!digits) next.phone = 'Please add your phone number.'
    else if (!chosen) next.phone = 'Pick your country code first.'
    else if (digits.length < chosen.min || digits.length > chosen.max) {
      const span = chosen.min === chosen.max ? `${chosen.min}` : `${chosen.min}–${chosen.max}`
      next.phone = `A ${chosen.name} number has ${span} digits; this one has ${digits.length}.`
    }

    const tg = normalizeTelegram(value.telegram)
    if (!tg) next.telegram = 'Please add your Telegram handle — it is where we reply.'
    else if (!TELEGRAM_RE.test(tg)) {
      next.telegram = 'That does not look like a Telegram handle. 5–32 letters, digits or _, like @yourhandle.'
    }

    setErrs(next)
    const first = FIELD_ORDER.find((k) => next[k])
    if (first) {
      const el = formRef.current?.querySelector<HTMLInputElement>(`#af-${first}`)
      el?.focus()
      el?.scrollIntoView({ block: 'center' })
      return
    }
    onNext()
  }

  const chosen = findDial(value.phoneIso)

  // A number typed or pasted with its own dialling code ("+48 601…", "0048…")
  // outranks the selector: the code comes off, the country chip follows it.
  // When the typed code matches the chip already on show, the chip stays —
  // a Canadian who picked CA and pasted a +1 number must not become "US".
  const setPhone = (v: string) => {
    const split = splitDial(v)
    if (split && findDial(split.iso)) {
      const iso = chosen && chosen.dial === split.dial ? value.phoneIso : split.iso
      onChange({ ...value, phone: split.rest, phoneIso: iso })
      setErrs((e) => {
        if (!('phone' in e)) return e
        const next = { ...e }
        delete next.phone
        return next
      })
      return
    }
    set('phone', v)
  }

  const field = (k: FieldKey) => ({
    id: `af-${k}`,
    className: 'mm-input',
    value: value[k],
    onChange: (e: { target: { value: string } }) => set(k, e.target.value),
    'aria-invalid': errs[k] ? (true as const) : undefined,
    'aria-describedby': errs[k] ? `af-${k}-err` : undefined,
  })

  return (
    <form className="mm-qflow-body" onSubmit={submit} noValidate ref={formRef}>
      <span className="mm-qflow-kicker">Your details</span>
      <p className="mm-qflow-question">Where should we reply?</p>
      <p className="mm-qflow-desc">
        Only used to answer this application. Nothing is charged and nothing is shared.
      </p>

      {/* Honeypot — real people never see this. Filled = bot, dropped server-side.
          Deliberately NOT called "company": Chromium classifies that name as the
          organisation of a saved address and fills it, offscreen or not, so a real
          applicant using autofill was answered "ok" and silently deleted. Nothing
          in this name matches a profile field, so only something typing into every
          input reaches the trap. */}
      <input
        className="mm-hp"
        type="text"
        name="referral_note"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={value.referralNote}
        onChange={(e) => set('referralNote', e.target.value)}
      />

      <div className="mm-field">
        <label htmlFor="af-name">Full name</label>
        <input {...field('name')} type="text" autoComplete="name" placeholder="John Example" required />
        {errs.name && <span className="mm-field-err" id="af-name-err" role="alert">{errs.name}</span>}
      </div>
      <div className="mm-field">
        <label htmlFor="af-email">Email</label>
        {/* An address is not a sentence: without these iOS capitalises the
            first letter and autocorrects the domain as it is typed. */}
        <input {...field('email')} type="email" inputMode="email" autoComplete="email"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder="you@email.com" required />
        {errs.email && <span className="mm-field-err" id="af-email-err" role="alert">{errs.email}</span>}
      </div>
      <div className="mm-field">
        <label htmlFor="af-phone">Phone</label>
        {/* Country first, then the national part, so the number arrives with a
            dialling code in front of it. The country is preselected from the
            device's own time zone; it is a starting point, not a claim, and one
            tap changes it. */}
        <div className="mm-phone">
          {/* The real <select> sits transparent on top of the chip, so a tap
              opens the platform's own country picker — scrollable and
              searchable on every phone — while the page keeps its own look. */}
          <span className={`mm-phone-cc${chosen ? '' : ' is-empty'}`}>
            <span className="mm-phone-dial" aria-hidden="true">
              {/* Real artwork rather than the flag emoji. Windows ships no flag
                  glyphs at all, so the emoji renders there as the two letters
                  of the country code — this looks the same on every platform.
                  Exactly one file is fetched, for the country on show. */}
              {chosen ? (
                <>
                  <img className="mm-phone-flag" src={flagSrc(chosen.iso)} alt=""
                    width="20" height="15" decoding="async" />
                  {chosen.dial}
                </>
              ) : 'Country'}
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <select
              id="af-phone-cc"
              aria-label="Country dialling code"
              value={value.phoneIso}
              onChange={(e) => set('phoneIso', e.target.value)}
            >
              <option value="">Select your country</option>
              {DIAL_CODES.map((c) => (
                <option value={c.iso} key={c.iso}>
                  {c.flag} {c.name} {c.dial}
                </option>
              ))}
            </select>
          </span>
          {/* Room for a full number typed with its own +code and spaces (E.164
              tops out at 15 digits; separators come on top). setPhone strips
              the code back off, so what stays in the field is national only. */}
          <input {...field('phone')} onChange={(e) => setPhone(e.target.value)}
            type="tel" inputMode="tel" autoComplete="tel-national"
            maxLength={25} required
            placeholder={chosen ? samplePlaceholder(chosen.min) : 'Phone number'} />
        </div>
        {errs.phone
          ? <span className="mm-field-err" id="af-phone-err" role="alert">{errs.phone}</span>
          : <span className="mm-field-hint">Pick your country, then the number without the code.</span>}
      </div>
      <div className="mm-field">
        <label htmlFor="af-telegram">Telegram</label>
        <input {...field('telegram')} type="text" autoComplete="username"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder="@yourhandle" required />
        {errs.telegram
          ? <span className="mm-field-err" id="af-telegram-err" role="alert">{errs.telegram}</span>
          : <span className="mm-field-hint">Onboarding and support run on Telegram. This is where we reply.</span>}
      </div>

      {/* Zgoda na SMS, przy polu, w którym numer jest wpisywany. Nie ozdoba
          prawna: bez tego zdania na widocznej stronie amerykański operator nie
          przepuści ani jednej wiadomości (weryfikacja numeru toll-free pyta
          wprost o adres formularza i szuka tu marki, przeznaczenia i wyjścia).
          Zmiana treści = ponowna weryfikacja u operatora. */}
      <p className="mm-field-hint mm-af-consent">
        By continuing you agree that Forex Passing may contact you about this application
        by SMS and on Telegram. Message frequency varies, message and data rates may apply,
        and you can reply STOP at any time to stop the texts.
      </p>

      <button type="submit" className="mm-btn mm-btn-lg mm-btn-full">Continue</button>
      {onBack && <button type="button" className="mm-qflow-back" onClick={onBack}>← Back</button>}
    </form>
  )
}

/* -------------------------------------------------------------------------- */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'

/** Modal wrapper. Escape closes it; the page behind stops scrolling. */
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
  // Once there is something to lose, a stray tap on the backdrop must not
  // throw the panel away. The × and Escape stay available.
  const [dirty, setDirty] = useState(false)
  const markDirty = useCallback(() => setDirty(true), [])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // Without this, Tab walks straight out of the panel and into the page
      // behind it, which is still there and still clickable.
      const card = cardRef.current
      if (!card) return
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.tabIndex >= 0 && n.getClientRects().length > 0
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    // overflow:hidden on <body> does not hold on iOS Safari — the page behind
    // still rubber-bands once the card is scrolled to its end. Pinning the body
    // does, at the cost of having to put the scroll position back afterwards.
    const body = document.body
    const y = window.scrollY
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    // The card, not the first control: the close button would take a visible
    // focus ring, and an input would open the phone keyboard over the question
    // before it has been read.
    cardRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      // Unpinning drops the page back to offset 0, and the global
      // scroll-behavior:smooth would then animate the way back — the page flies
      // to the top and glides down again every time the card is closed. Putting
      // the position back has to be instant to read as "nothing moved".
      const html = document.documentElement
      const prevBehavior = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      window.scrollTo(0, y)
      html.style.scrollBehavior = prevBehavior
      // Back to the button that opened it, so keyboard readers do not land at
      // the top of the document.
      opener?.focus?.()
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
        if (e.target === e.currentTarget && !dirty) onClose()
      }}
    >
      <div className="mm-modal-card" ref={cardRef} tabIndex={-1}>
        <button type="button" className="mm-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="mm-modal-body">
          <ApplyFlow initialName={initialName} source={source} onDirty={markDirty} />
        </div>
      </div>
    </div>,
    document.body
  )
}
