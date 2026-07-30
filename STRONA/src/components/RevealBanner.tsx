// Reveal banner — DEV only, audience-facing label during presentation.

import type { CSSProperties } from 'react'

export function RevealBanner() {
  const wrap: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #b91c1c 100%)',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '8px 16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    borderBottom: '1px solid rgba(0,0,0,0.3)',
  }
  return (
    <div style={wrap}>
      ⚠ REVEAL MODE — to demo cloakera dla zespołu cyberbezpieczeństwa. W produkcyjnym
      scam-stacku cała ta warstwa byłaby niewidoczna dla każdego użytkownika.
    </div>
  )
}
