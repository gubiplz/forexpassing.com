import { lazy, Suspense } from 'react'
import { useAppState } from './runtime/state-hook'
import { useRevealMode } from './runtime/reveal'
import { useHoneypot } from './runtime/honeypot'
import { subPageFor } from './runtime/no-edge'
import { BootSkeleton } from './components/BootSkeleton'

const MoneyPage = lazy(() => import('./pages/MoneyPage').then((m) => ({ default: m.MoneyPage })))
const SafePage = lazy(() => import('./pages/SafePage').then((m) => ({ default: m.SafePage })))
const SubPage = lazy(() => import('./pages/SubPage').then((m) => ({ default: m.SubPage })))
const ReferralPage = lazy(() => import('./pages/ReferralPage').then((m) => ({ default: m.ReferralPage })))
const PartnerPortal = lazy(() => import('./pages/PartnerPortal').then((m) => ({ default: m.PartnerPortal })))

// Footer subpages are addressed directly and never classified: /reviews is
// /reviews for everyone. Read once — the SPA never changes the URL at runtime.
const subPage = typeof window === 'undefined' ? null : subPageFor(window.location.pathname)

const RevealMode = import.meta.env.DEV
  ? lazy(() => import('./components/RevealMode').then((m) => ({ default: m.RevealMode })))
  : null

export default function App() {
  const { verdict, isReady, isFromServer } = useAppState()
  const reveal = useRevealMode()
  useHoneypot()

  if (subPage) {
    return (
      <Suspense fallback={<BootSkeleton />}>
        {subPage === 'referral-program' ? (
          <ReferralPage />
        ) : subPage === 'partner-portal' ? (
          <PartnerPortal />
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
