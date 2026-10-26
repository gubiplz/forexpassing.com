// The management agreement, rendered as a document rather than as web copy.
//
// A contract that is set in the page's own body type reads like marketing. The
// same words on a sheet of paper — serif, justified, numbered clauses, a
// signature block at the foot — read like something you are about to sign, and
// that is the point of publishing it. So this is a viewer: a framed sheet that
// scrolls inside its own frame, with the page around it left dark.
//
// [PLACEHOLDERS] in the source data are marked up rather than hidden. Somebody
// reading it should see exactly which blanks get filled in for them.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AGREEMENT, type Block } from '../data/agreement'
import { track } from '../pages/shared'

/** Splits "paid to [CLIENT_FULL_NAME] today" into text and marked-up blanks. */
function withPlaceholders(text: string) {
  const parts = text.split(/(\[[A-Z_]+\])/g)
  return parts.map((part, i) =>
    /^\[[A-Z_]+\]$/.test(part) ? (
      <span className="mm-agr-ph" key={i}>
        {part.slice(1, -1).toLowerCase().replace(/_/g, ' ')}
      </span>
    ) : (
      part
    )
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'paragraph') return <p key={i}>{withPlaceholders(b.text)}</p>

        if (b.type === 'lettered')
          return (
            <ol className="mm-agr-lettered" key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <span className="mm-agr-mark">{String.fromCharCode(97 + j)})</span>{' '}
                  {withPlaceholders(item)}
                </li>
              ))}
            </ol>
          )

        return (
          <div className="mm-agr-listblock" key={i}>
            {b.label && <p className="mm-agr-listlabel">{b.label}</p>}
            <ul className="mm-agr-list">
              {b.items.map((item, j) => (
                <li key={j}>{withPlaceholders(item)}</li>
              ))}
            </ul>
          </div>
        )
      })}
    </>
  )
}

/** Browsers built into apps (Instagram, Facebook, TikTok…) ignore window.print(). */
const IN_APP_UA =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|; wv\)/i

/**
 * Print the page itself, straight from the tap.
 *
 * The print sheet lives in site.css: with the modal open it hides #root, lays
 * the modal out as plain white paper and drops the viewer chrome. An earlier
 * version opened a separate window instead, but window.open() with "noopener"
 * returns null — visitors got an empty tab while the page behind it printed, and
 * on a phone they saw only the empty tab. Printing in place also keeps the tap
 * as the user gesture iOS Safari and Android Chrome want before showing print.
 */
function printAgreement() {
  const before = document.title
  // The title is what browsers offer as the PDF's file name.
  document.title = AGREEMENT.title
  const restore = () => {
    document.title = before
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}

export function AgreementDocument() {
  const [inApp, setInApp] = useState(false)
  const [copied, setCopied] = useState(false)

  const print = () => {
    track('ContractPrint', 'contract_print', { source: 'contract' })
    if (IN_APP_UA.test(navigator.userAgent)) setInApp(true)
    printAgreement()
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => setCopied(true),
      () => setCopied(false)
    )
  }

  return (
    <div className="mm-agr">
      <div className="mm-agr-bar">
        <span className="mm-agr-file">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17">
            <path
              d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span className="mm-agr-filename">{AGREEMENT.title}</span>
        </span>

        <span className="mm-agr-tools">
          <span className="mm-agr-chip">Specimen copy</span>
          <button type="button" className="mm-agr-print" onClick={print}>
            Print / save as PDF
          </button>
        </span>
      </div>

      {inApp && (
        <div className="mm-agr-inapp" role="status">
          <p>
            If no print window opened, this app&rsquo;s built-in browser can&rsquo;t save PDFs.
            Open the page in Safari or Chrome (the &hellip; menu, then &ldquo;Open in browser&rdquo;)
            and tap &ldquo;Print / save as PDF&rdquo; again.
          </p>
          <button type="button" className="mm-agr-print" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}

      <div className="mm-agr-sheet" lang="en">
        <article className="mm-agr-page">
          <h2 className="mm-agr-title">{AGREEMENT.title}</h2>

          <div className="mm-agr-preamble">
            {AGREEMENT.preamble.map((line, i) =>
              line === '' ? (
                <div className="mm-agr-gap" aria-hidden="true" key={i} />
              ) : (
                <p key={i}>{withPlaceholders(line)}</p>
              )
            )}
          </div>

          {AGREEMENT.sections.map((s) => (
            <section className="mm-agr-sec" key={s.number}>
              <h3 className="mm-agr-head">
                {s.number}. {s.heading}
              </h3>
              <Blocks blocks={s.blocks} />
            </section>
          ))}

          <div className="mm-agr-sign">
            {AGREEMENT.signature.map((s) => (
              <div className="mm-agr-sign-col" key={s.role}>
                <div className="mm-agr-sign-rule" />
                <p className="mm-agr-sign-role">{s.role}</p>
                <p className="mm-agr-sign-name">{withPlaceholders(s.name)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <p className="mm-agr-note">
        This is the standard wording, published so you can read it before you apply rather than
        after. The copy you sign carries your name, the date and your account size in place of the
        blanks, and that signed copy is the one that governs.
      </p>
    </div>
  )
}

/**
 * The agreement in a window, opened by every "See contract" button on the page.
 *
 * On <body> rather than in place: any ancestor with a transform — every
 * .mm-reveal section has one — becomes the containing block for position:fixed
 * and the window would open wherever that section happens to sit.
 */
export function ContractModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('mm-agr-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      document.body.classList.remove('mm-agr-open')
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="mm-modal"
      role="dialog"
      aria-modal="true"
      aria-label={AGREEMENT.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mm-modal-card is-wide">
        <button type="button" className="mm-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="mm-modal-body">
          <AgreementDocument />
        </div>
      </div>
    </div>,
    document.body
  )
}
