// Reveal mode — DEV only. Used during presentation to inspect runtime verdict
// and compare what HUMAN vs BOT viewers see. Tree-shaken from production bundle.

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import type { Verdict, ReasonEntry } from '../runtime/state'
import { RevealBanner } from './RevealBanner'
import { MoneyPage } from '../pages/MoneyPage'
import { SafePage } from '../pages/SafePage'

interface Props {
  verdict: Verdict
  isReady: boolean
  isFromServer: boolean
}

type Pane = 'money' | 'safe' | 'split'

export function RevealMode({ verdict, isReady, isFromServer }: Props) {
  const [pane, setPane] = useState<Pane>('split')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <RevealBanner />
      <div style={{ paddingTop: 44 }}>
        <VerdictPanel verdict={verdict} isReady={isReady} isFromServer={isFromServer} />
        <PaneSelector pane={pane} onChange={setPane} />
        <LogPanel />
        <PreviewArea pane={pane} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// VERDICT PANEL
// ──────────────────────────────────────────────────────────
function VerdictPanel({
  verdict,
  isReady,
  isFromServer,
}: {
  verdict: Verdict
  isReady: boolean
  isFromServer: boolean
}) {
  const color = classColor(verdict.classification)
  return (
    <section
      style={{
        background: '#111',
        border: `1px solid #222`,
        borderLeft: `4px solid ${color}`,
        padding: 20,
        margin: '16px',
        borderRadius: 8,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 13,
      }}
    >
      <header
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'baseline',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.04em' }}>
          CLOAKING VERDICT
        </h2>
        <span style={{ color, fontWeight: 700, fontSize: 15 }}>
          {verdict.classification.toUpperCase()}
        </span>
        <span style={{ color: '#888' }}>
          score: <span style={{ color: color }}>{verdict.score >= 0 ? '+' : ''}{verdict.score}</span>
        </span>
        <span style={{ color: '#888' }}>req: {verdict.requestId}</span>
        <span style={{ color: '#888' }}>
          mode:{' '}
          {isFromServer
            ? isReady
              ? 'server (verified)'
              : 'server (initial, waiting verify…)'
            : 'dev (no Worker)'}
        </span>
        {verdict.cookieIssued && (
          <span style={{ color: '#10b981' }}>cookie: issued ✓</span>
        )}
      </header>

      <ReasonList reasons={verdict.reasons} />
    </section>
  )
}

function ReasonList({ reasons }: { reasons: ReasonEntry[] }) {
  if (reasons.length === 0) {
    return <p style={{ color: '#666' }}>brak powodów (verdict bazowy)</p>
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gap: 4,
      }}
    >
      {reasons.map((r, i) => (
        <li
          key={`${r.code}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr 60px',
            gap: 12,
            padding: '4px 0',
            borderBottom: '1px dashed #222',
          }}
        >
          <span
            style={{
              color: r.weight >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 700,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {r.weight >= 0 ? '+' : ''}
            {r.weight}
          </span>
          <span style={{ color: '#ccc' }}>
            <code style={{ color: '#7dd3fc' }}>{r.code}</code>
            {r.detail && <> — <span style={{ color: '#aaa' }}>{r.detail}</span></>}
          </span>
          <span />
        </li>
      ))}
    </ul>
  )
}

// ──────────────────────────────────────────────────────────
// PANE SELECTOR
// ──────────────────────────────────────────────────────────
function PaneSelector({ pane, onChange }: { pane: Pane; onChange: (p: Pane) => void }) {
  const btn = (p: Pane): CSSProperties => ({
    padding: '6px 14px',
    border: `1px solid ${pane === p ? '#10b981' : '#333'}`,
    background: pane === p ? '#10b98122' : 'transparent',
    color: pane === p ? '#10b981' : '#ccc',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  })
  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
      <button onClick={() => onChange('split')} style={btn('split')} type="button">
        SPLIT
      </button>
      <button onClick={() => onChange('money')} style={btn('money')} type="button">
        MONEY (co widzi cz-k)
      </button>
      <button onClick={() => onChange('safe')} style={btn('safe')} type="button">
        SAFE (co widzi bot)
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PREVIEW AREA
// ──────────────────────────────────────────────────────────
function PreviewArea({ pane }: { pane: Pane }) {
  const frame: CSSProperties = {
    border: '1px solid #333',
    background: '#000',
    minHeight: '70vh',
    overflow: 'hidden',
    borderRadius: 8,
  }
  const label: CSSProperties = {
    padding: '8px 16px',
    background: '#111',
    color: '#888',
    fontSize: 11,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid #222',
  }
  const inner: CSSProperties = {
    height: 'calc(70vh - 32px)',
    overflowY: 'auto',
  }

  if (pane === 'money') {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <div style={frame}>
          <div style={label}>▶ MoneyPage (human verdict)</div>
          <div style={inner}><MoneyPage /></div>
        </div>
      </div>
    )
  }
  if (pane === 'safe') {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <div style={frame}>
          <div style={label}>▶ SafePage (bot/reviewer verdict)</div>
          <div style={inner}><SafePage /></div>
        </div>
      </div>
    )
  }
  // split
  return (
    <div
      style={{
        padding: '0 16px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}
    >
      <div style={frame}>
        <div style={label}>▶ MoneyPage — co widzi cz-k z fbclid z PL</div>
        <div style={inner}><MoneyPage /></div>
      </div>
      <div style={frame}>
        <div style={label}>▶ SafePage — co widzi Meta/Google reviewer</div>
        <div style={inner}><SafePage /></div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// LOG PANEL
// ──────────────────────────────────────────────────────────
interface LogEntry {
  ts: number
  requestId: string
  classification: Verdict['classification']
  score: number
  reasons: ReasonEntry[]
  ctx: {
    country?: string
    asn?: number
    asOrg?: string
    uaShort: string
    path: string
    hasFbclid: boolean
    hasGclid: boolean
  }
}

function LogPanel() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    const fetchOnce = async () => {
      try {
        const r = await fetch('/api/__edge/log')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = (await r.json()) as { entries: LogEntry[] }
        if (cancelled) return
        setEntries(j.entries)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(`brak Workera (lokalnie odpal: cd apps/ebook && npm run dev:worker) — ${(e as Error).message}`)
        setEntries([])
      }
    }
    fetchOnce()
    const id = setInterval(fetchOnce, 5_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [expanded])

  return (
    <section
      style={{
        background: '#0c0c0c',
        border: '1px solid #222',
        margin: '0 16px 16px',
        borderRadius: 8,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 12,
      }}
    >
      <header style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>
          LIVE LOG (/api/__edge/log)
        </h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid #333',
            color: '#ccc',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {expanded ? 'ukryj' : 'pokaż ostatnie 50'}
        </button>
      </header>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {error && <p style={{ color: '#f59e0b' }}>{error}</p>}
          {entries && entries.length === 0 && !error && (
            <p style={{ color: '#666' }}>brak wpisów (zrób kilka wizyt różnymi UA / fbclid)</p>
          )}
          {entries && entries.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#666', textAlign: 'left' }}>
                    <th style={th}>czas</th>
                    <th style={th}>verdict</th>
                    <th style={th}>score</th>
                    <th style={th}>geo</th>
                    <th style={th}>asn</th>
                    <th style={th}>fbclid/gclid</th>
                    <th style={th}>UA (truncated)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={`${e.ts}-${e.requestId}`} style={{ borderTop: '1px dashed #222' }}>
                      <td style={td}>{new Date(e.ts).toISOString().slice(11, 19)}</td>
                      <td style={{ ...td, color: classColor(e.classification) }}>
                        {e.classification}
                      </td>
                      <td style={td}>{e.score >= 0 ? '+' : ''}{e.score}</td>
                      <td style={td}>{e.ctx.country ?? '?'}</td>
                      <td style={td}>{e.ctx.asn ? `AS${e.ctx.asn}` : '?'}</td>
                      <td style={td}>{e.ctx.hasFbclid ? 'fb' : ''} {e.ctx.hasGclid ? 'g' : ''}</td>
                      <td style={{ ...td, color: '#888', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.ctx.uaShort}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const th: CSSProperties = { padding: '6px 8px', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }
const td: CSSProperties = { padding: '4px 8px', fontVariantNumeric: 'tabular-nums' }

function classColor(c: Verdict['classification']): string {
  switch (c) {
    case 'human':
      return '#10b981'
    case 'suspicious':
      return '#f59e0b'
    case 'reviewer':
      return '#f97316'
    case 'bot':
      return '#ef4444'
    default:
      return '#888'
  }
}
