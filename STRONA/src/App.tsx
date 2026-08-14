import { lazy, Suspense } from 'react'
import { useAppState } from './runtime/state-hook'
import { useRevealMode } from './runtime/reveal'
import { useHoneypot } from './runtime/honeypot'
import { payTokenFor, subPageFor } from './runtime/no-edge'
import { BootSkeleton } from './components/BootSkeleton'

const MoneyPage = lazy(() => import('./pages/MoneyPage').then((m) => ({ default: m.MoneyPage })))
const SafePage = lazy(() => import('./pages/SafePage').then((m) => ({ default: m.SafePage })))
const SubPage = lazy(() => import('./pages/SubPage').then((m) => ({ default: m.SubPage })))
const ReferralPage = lazy(() => import('./pages/ReferralPage').then((m) => ({ default: m.ReferralPage })))
const PartnerPortal = lazy(() => import('./pages/PartnerPortal').then((m) => ({ default: m.PartnerPortal })))
const GoogleFunnel = lazy(() => import('./pages/GoogleFunnel').then((m) => ({ default: m.GoogleFunnel })))
const FreeAccountPage = lazy(() => import('./pages/FreeAccountPage').then((m) => ({ default: m.FreeAccountPage })))
const ThankYouPage = lazy(() => import('./pages/ThankYouPage').then((m) => ({ default: m.ThankYouPage })))
const PayPage = lazy(() => import('./pages/PayPage').then((m) => ({ default: m.PayPage })))

// Footer subpages are addressed directly and never classified: /reviews is
// /reviews for everyone. Read once — the SPA never changes the URL at runtime.
const subPage = typeof window === 'undefined' ? null : subPageFor(window.location.pathname)
const payToken = typeof window === 'undefined' ? null : payTokenFor(window.location.pathname)

const RevealMode = import.meta.env.DEV
  ? lazy(() => import('./components/RevealMode').then((m) => ({ default: m.RevealMode })))
  : null

export default function App() {
  const { verdict, isReady, isFromServer } = useAppState()
  const reveal = useRevealMode()
  useHoneypot()

  // Płacący klient nie podlega żadnej klasyfikacji. Ma nasz link z rozmowy,
  // otwiera go z Telegrama — a wbudowana przeglądarka Telegrama wygląda w
  // pomiarach jak byle co. Gdyby ta strona przechodziła przez werdykt, człowiek
  // z fakturą do zapłacenia zobaczyłby stronę bezpieczną i nie miałby gdzie
  // kliknąć. Stoi przed wszystkim innym, bo jest najbardziej jednoznaczna:
  // adres z ważnym tokenem ma dokładnie jedno znaczenie.
  if (payToken) {
    return (
      <Suspense fallback={<BootSkeleton />}>
        <PayPage token={payToken} />
      </Suspense>
    )
  }

  if (subPage) {
    return (
      <Suspense fallback={<BootSkeleton />}>
        {subPage === 'referral-program' ? (
          <ReferralPage />
        ) : subPage === 'partner-portal' ? (
          <PartnerPortal />
        ) : subPage === 'google-funnel' ? (
          <GoogleFunnel />
        ) : subPage === 'freeaccount' ? (
          <FreeAccountPage />
        ) : subPage === 'thank-you' ? (
          <ThankYouPage />
        ) : (
          <SubPage page={subPage} />
        )}
      </Suspense>
    )
  }

  if (import.meta.env.DEV && reveal && RevealMode) {
    return (
      <Suspense fallback={<BootSkeleton />}>
        <RevealMode verdict={verdict} isReady={isReady} isFromServer={isFromServer} />
      </Suspense>
    )
  }

  // Render decision: server verdict is final UNLESS suspicious (then wait for
  // challenge verification to determine human or bot, no flash either way).
  const cls = verdict.classification
  if (isFromServer && cls === 'suspicious' && !isReady) {
    // Boot skeleton until verify completes (resolves to human after challenge
    // or stays as suspicious → SafePage on timeout/failure)
    return <BootSkeleton />
  }

  return (
    <Suspense fallback={<BootSkeleton />}>
      {cls === 'human' ? <MoneyPage /> : <SafePage />}
    </Suspense>
  )
}
