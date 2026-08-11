// Forex Passing — /pay/<token>, strona jednego zamówienia.
//
// Trafia tu klient, który dogadał zakup na Telegramie i dostał od nas JEDEN
// link. Nie ma tu wyboru produktu ani koszyka: pozycja i kwota są już ustalone,
// a strona ma zrobić dokładnie dwie rzeczy — pokazać, za co płaci, i wpuścić go
// do kasy jednym kliknięciem.
//
// Kasę prowadzi prop firma, z którą pracujemy, i jej nazwa będzie na wyciągu
// z karty. Strona mówi to WPROST, nad przyciskiem, a nie w stopce: człowiek,
// który zobaczy na wyciągu firmę, o której nikt mu nie powiedział, dzwoni do
// banku, nie do nas.
//
// Zamówienie czyta serwerowa funkcja api/pay/[token].js — sekret integracji
// nigdy nie trafia do przeglądarki. Stąd idą tylko dwa żądania do własnej
// domeny.

import { useEffect, useState } from 'react'
import { CONTACT_EMAIL, PARTNER_FIRM, TELEGRAM_HREF } from '../constants'
import { SiteFooter, TopBar } from './shared'

type Zamowienie = {
  item: string
  amount: number
  currency: string
  reference: string
  status: string
  // Trzy pola albo żadne — przychodzą wyłącznie dla zamówień ze zniżką
  // partnerską i tylko wtedy karta pokazuje przekreśloną cenę.
  listAmount?: number
  discount?: number
  discountPct?: number
}

// Stan strony jest jednym z pięciu, nigdy mieszanką: dopóki nie wiadomo, co to
// za zamówienie, nie ma czego pokazać ani czego kliknąć.
type Stan =
  | { k: 'loading' }
  | { k: 'ok'; zam: Zamowienie }
  | { k: 'paid'; zam: Zamowienie }
  | { k: 'missing' }
  | { k: 'error' }

const kwota = (v: number, waluta: string) =>
  `${waluta === 'USD' ? '$' : ''}${v.toLocaleString('en-US', {
    minimumFractionDigits: v % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}${waluta === 'USD' ? '' : ` ${waluta}`}`

// Kasa odsyła klienta z powrotem tutaj, z ?paid=1 albo ?canceled=1. Czytamy to
// RAZ, przy wejściu w moduł (a nie w efekcie — StrictMode puszcza efekty
// dwukrotnie), i od razu czyścimy pasek adresu: po odświeżeniu ma zostać zwykły
// link do zamówienia, a nie zamrożony komunikat sprzed pięciu minut.
const POWROT: '' | 'paid' | 'canceled' = (() => {
  if (typeof window === 'undefined') return ''
  const q = new URLSearchParams(window.location.search)
  const stan = q.get('paid') === '1' ? 'paid' : q.get('canceled') === '1' ? 'canceled' : ''
  if (stan) window.history.replaceState(null, '', window.location.pathname)
  return stan
})()

export function PayPage({ token }: { token: string }) {
  const [stan, setStan] = useState<Stan>({ k: 'loading' })
  const [otwieram, setOtwieram] = useState(false)
  const [blad, setBlad] = useState('')

  useEffect(() => {
    let zywe = true
    fetch(`/api/pay/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!zywe) return
        if (r.status === 404) return setStan({ k: 'missing' })
        if (!r.ok) return setStan({ k: 'error' })
        const zam: Zamowienie = await r.json()
        // Opłacone i wygaszone to nie to samo co „nie ma takiego linku": ktoś
        // wraca do zakładki, którą zostawił otwartą, i ma się dowiedzieć, że
        // zapłacił, a nie że link jest zły.
        //
        // Powrót z kasy liczy się na równi ze statusem zamówienia. Stripe odsyła
        // tu od razu, a nasz status przestawia dopiero webhook sekundę później —
        // w tej szczelinie klient, który WŁAŚNIE zapłacił, zobaczyłby przycisk
        // „zapłać" i drugi raz sięgnął po kartę.
        setStan({ k: zam.status === 'paid' || POWROT === 'paid' ? 'paid' : 'ok', zam })
      })
      .catch(() => zywe && setStan({ k: 'error' }))
    return () => {
      zywe = false
    }
  }, [token])

  async function doKasy() {
    setOtwieram(true)
    setBlad('')
    try {
      const r = await fetch(`/api/pay/${encodeURIComponent(token)}`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d.checkout_url) {
        setBlad(
          r.status === 400 && typeof d.error === 'string' && d.error
            ? d.error
            : 'We could not open the checkout. Try again in a moment.'
        )
        setOtwieram(false)
        return
      }
      // Przypisanie zamiast <a>: adres kasy powstaje dopiero po kliknięciu,
      // więc nie ma go w kodzie strony, którą ktoś mógłby przekleić dalej.
      window.location.href = d.checkout_url
    } catch {
      setBlad('We could not open the checkout. Try again in a moment.')
      setOtwieram(false)
    }
  }

  return (
    <div className="mm-root mm-root-sub">
      <style>{CSS}</style>
      <TopBar href="/" />

      <section className="mm-section mm-pay">
        <div className="mm-wrap mm-pay-wrap">
          {stan.k === 'loading' && (
            <div className="mm-pay-card mm-pay-wait" aria-live="polite">
              <div className="mm-pay-bar" />
              <div className="mm-pay-bar mm-pay-bar-sm" />
              <p className="mm-pay-note">Loading your order…</p>
            </div>
          )}

          {stan.k === 'missing' && (
            <div className="mm-pay-card">
              <h1 className="mm-h2 mm-pay-h">This link is not valid</h1>
              <p className="mm-lead mm-pay-lead">
                It may have been cancelled or replaced with a newer one. Message us and we
                will send you a fresh link — nothing is lost.
              </p>
              <a className="mm-btn mm-btn-lg mm-btn-full" href={TELEGRAM_HREF}>
                Message us on Telegram
              </a>
            </div>
          )}

          {stan.k === 'error' && (
            <div className="mm-pay-card">
              <h1 className="mm-h2 mm-pay-h">We cannot load this right now</h1>
              <p className="mm-lead mm-pay-lead">
                Your order is fine — this page is not. Refresh in a minute, or message us
                and we will handle it by hand.
              </p>
              <a className="mm-btn mm-btn-lg mm-btn-full" href={TELEGRAM_HREF}>
                Message us on Telegram
              </a>
            </div>
          )}

          {stan.k === 'paid' && (
            <div className="mm-pay-card">
              <div className="mm-pay-done">Paid</div>
              <h1 className="mm-h2 mm-pay-h">
                {POWROT === 'paid' ? 'Payment received' : 'This order is already paid'}
              </h1>
              <p className="mm-lead mm-pay-lead">
                {stan.zam.item} · {stan.zam.reference}. Nothing more to do here. Your
                platform login is emailed by <b>{PARTNER_FIRM}</b> once the account is
                live — so watch for a message under their name, not ours, and check spam
                if it is not in the inbox within the hour.
              </p>
              <a className="mm-btn mm-btn-lg mm-btn-full" href={TELEGRAM_HREF}>
                Open the chat
              </a>
            </div>
          )}

          {stan.k === 'ok' && (
            <div className="mm-pay-card">
              <div className="mm-pay-top">
                <span className="mm-eyebrow mm-eyebrow-teal">Your order</span>
                {stan.zam.listAmount != null && (
                  <span className="mm-pay-off">−{stan.zam.discountPct}% applied</span>
                )}
              </div>
              <h1 className="mm-h2 mm-pay-h">{stan.zam.item}</h1>

              {/* Wrócił z kasy bez płacenia. Nie „coś poszło nie tak" — wyszedł
                  sam i ma usłyszeć, że nic go to nie kosztowało, a cena stoi. */}
              {POWROT === 'canceled' && (
                <p className="mm-pay-back" role="status">
                  You left the checkout, so <b>nothing was charged</b>. The order below is
                  untouched — pick it up whenever you are ready.
                </p>
              )}

              <div className="mm-pay-rows">
                <div className="mm-pay-row">
                  <span>Amount</span>
                  <span className="mm-pay-price">
                    {stan.zam.listAmount != null && (
                      <s className="mm-pay-was">
                        {kwota(stan.zam.listAmount, stan.zam.currency)}
                      </s>
                    )}
                    <b className="mm-pay-amt">{kwota(stan.zam.amount, stan.zam.currency)}</b>
                  </span>
                </div>
                {stan.zam.listAmount != null && (
                  <div className="mm-pay-row">
                    <span>You save</span>
                    <b className="mm-pay-save">
                      −{kwota(stan.zam.discount ?? 0, stan.zam.currency)}
                    </b>
                  </div>
                )}
                <div className="mm-pay-row">
                  <span>Reference</span>
                  <b>{stan.zam.reference}</b>
                </div>
              </div>

              {/* Zniżka, o której klient słyszał na Telegramie, do tej pory
                  istniała wyłącznie w tamtej rozmowie. Tu ma zobaczyć, że jest
                  już w kwocie — i że nie ma nic do wpisania ani odzyskania. */}
              {stan.zam.listAmount != null && (
                <p className="mm-pay-deal">
                  Your {stan.zam.discountPct}% partner rate is{' '}
                  <b>already off the amount above</b>. No code to enter, nothing to claim
                  back later — this link is the discount.
                </p>
              )}

              {/* Nad przyciskiem, nie pod nim. To jedyne zdanie na tej stronie,
                  które klient MUSI przeczytać zanim kliknie. */}
              <p className="mm-pay-who">
                Payment is taken by <b>{PARTNER_FIRM}</b>, the prop firm we work with — that
                is the name you will see on your card statement and on the receipt.
              </p>

              <button
                className="mm-btn mm-btn-lg mm-btn-full"
                onClick={doKasy}
                disabled={otwieram}
              >
                {otwieram
                  ? 'Opening secure checkout…'
                  : `Pay ${kwota(stan.zam.amount, stan.zam.currency)} by card`}
              </button>

              {blad && (
                <p className="mm-pay-err" role="alert">
                  {blad}
                </p>
              )}

              <p className="mm-pay-note">
                Card details are entered on Stripe, never here. Questions before you pay:{' '}
                <a href={TELEGRAM_HREF}>Telegram</a> or{' '}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter variant="blank" />
    </div>
  )
}

const CSS = `
.mm-pay{padding:48px 0 72px;min-height:60vh}
.mm-pay-wrap{max-width:560px}
.mm-pay-card{background:var(--bg);border:1px solid var(--line);border-radius:18px;
  padding:32px 28px;box-shadow:0 24px 60px -30px rgba(15,30,22,.28)}
.mm-pay-h{font-size:clamp(26px,5vw,38px);line-height:1.08;margin:12px 0 0}
.mm-pay-lead{font-size:16px;margin:14px 0 24px}
.mm-pay-rows{margin:26px 0 22px;border-top:1px solid var(--line)}
.mm-pay-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  padding:14px 0;border-bottom:1px solid var(--line)}
.mm-pay-row span{color:var(--mut);font-size:14px}
.mm-pay-row b{font-size:16px;font-variant-numeric:tabular-nums}
.mm-pay-amt{font-size:26px;font-weight:800;letter-spacing:-.01em}
.mm-pay-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mm-pay-off{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  white-space:nowrap;color:var(--teal);background:rgba(21,128,61,.09);
  border:1px solid rgba(21,128,61,.35);border-radius:999px;padding:5px 11px}
/* Stara cena i nowa w jednej linii, obie wyrównane do prawej krawędzi wiersza:
   przekreślenie działa tylko wtedy, gdy oko przechodzi po nim WPROST na kwotę
   do zapłaty. */
.mm-pay-price{display:flex;align-items:baseline;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.mm-pay-was{color:var(--mut);font-size:17px;font-variant-numeric:tabular-nums;
  text-decoration-thickness:1.5px}
.mm-pay-save{color:var(--teal)}
.mm-pay-deal{font-size:14px;line-height:1.55;color:var(--mut);margin:0 0 18px;
  padding:12px 14px;background:rgba(21,128,61,.06);border-left:2px solid var(--teal);
  border-radius:0 10px 10px 0}
.mm-pay-deal b{color:var(--txt)}
.mm-pay-back{font-size:14px;line-height:1.55;color:var(--mut);margin:18px 0 0;
  padding:12px 14px;background:var(--bg2);border-radius:10px}
.mm-pay-back b{color:var(--txt)}
.mm-pay-who{font-size:14px;color:var(--mut);margin:0 0 18px;line-height:1.55}
.mm-pay-who b{color:var(--txt)}
.mm-pay-err{margin-top:14px;font-size:14px;color:var(--red);text-align:center}
.mm-pay-note{margin-top:16px;font-size:13px;color:var(--mut);text-align:center;line-height:1.6}
.mm-pay-note a{color:var(--teal);font-weight:600}
.mm-pay-done{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--teal);border:1px solid rgba(22,163,74,.35);
  border-radius:999px;padding:5px 12px}
.mm-btn:disabled{opacity:.6;cursor:progress;transform:none}
/* Zanim zamówienie się doczyta, w karcie stoją szare paski o wysokości tego, co
   je zastąpi — inaczej strona podskakuje pod palcem w chwili, gdy dane wchodzą. */
.mm-pay-wait{text-align:center}
.mm-pay-bar{height:38px;border-radius:10px;background:var(--bg2);margin:0 auto 14px;max-width:280px}
.mm-pay-bar-sm{height:22px;max-width:170px}
@media(prefers-reduced-motion:no-preference){
  .mm-pay-bar{animation:mm-pay-pulse 1.4s ease-in-out infinite}
}
@keyframes mm-pay-pulse{0%,100%{opacity:1}50%{opacity:.55}}
@media(max-width:520px){.mm-pay-card{padding:26px 20px;border-radius:14px}}
`
