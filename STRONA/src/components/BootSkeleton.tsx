// ⚠ CASE STUDY — BootSkeleton, pokazywany przez ~500ms-2s gdy SPA czeka
// na verdict z /api/cloak/verify.
//
// Realny TDS optymalizuje to bardzo agresywnie — chce <100ms żeby user nie
// zauważył. Tutaj prostsza wersja: pusty dark background z pulsing dotem.

import type { CSSProperties } from 'react'
import { COLORS } from '../constants'

export function BootSkeleton() {
  const wrap: CSSProperties = {
    minHeight: '100vh',
    background: COLORS.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const dot: CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: COLORS.accent,
    opacity: 0.6,
    animation: 'mm-boot-pulse 1.2s ease-in-out infinite',
  }
  return (
    <div style={wrap}>
      <style>{`
        @keyframes mm-boot-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50%      { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
      <div style={dot} aria-label="loading" />
    </div>
  )
}
