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

import { useEffect } from 'react'
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

/** Styles for the dedicated print window — white sheet only, no site chrome. */
const PRINT_DOC_CSS = `
  @page { margin: 18mm 16mm; }
  html, body { margin: 0; padding: 0; background: #fff !important; color: #1b1b1b; }
  body { font-family: Georgia, 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.7; }
  article { max-width: 40rem; margin: 0 auto; }
  p { margin: 0 0 12px; text-align: justify; hyphens: none; -webkit-hyphens: none; }
  h2 { font-size: 15.5px; font-weight: 700; text-align: center; text-transform: uppercase;
    letter-spacing: .14em; line-height: 1.45; margin: 0 0 30px; padding-bottom: 18px;
    border-bottom: 1px solid rgba(0,0,0,.16); }
  h3 { font-size: 13.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    margin: 0 0 14px; color: #111; break-after: avoid; }
  section { margin-bottom: 30px; }
  .mm-agr-gap { height: 8px; }
  .mm-agr-preamble { margin-bottom: 34px; }
  .mm-agr-lettered { list-style: none; margin: 0 0 12px; padding: 0; }
  .mm-agr-lettered li { text-align: justify; padding-left: 1.5rem; text-indent: -1.5rem; margin-bottom: 9px; hyphens: none; }
  .mm-agr-mark { font-weight: 700; font-variant-numeric: tabular-nums; }
  .mm-agr-listblock { margin-bottom: 14px; }
  .mm-agr-listlabel { font-weight: 700; margin-bottom: 7px !important; text-align: left !important; }
  .mm-agr-list { list-style: square; margin: 0 0 0 1.15rem; padding: 0; }
  .mm-agr-list li { text-align: justify; padding-left: .25rem; margin-bottom: 8px; hyphens: none; }
  .mm-agr-ph { font-style: italic; background: rgba(0,0,0,.06); border-bottom: 1px solid rgba(0,0,0,.3);
    padding: 0 4px; white-space: nowrap; }
  .mm-agr-sign { display: flex; gap: 34px; flex-wrap: wrap; margin-top: 46px; padding-top: 8px;
    break-inside: avoid; }
  .mm-agr-sign-col { flex: 1 1 200px; min-width: 0; }
  .mm-agr-sign-rule { height: 1px; background: rgba(0,0,0,.45); margin-bottom: 8px; }
  .mm-agr-sign-role { font-size: 11px !important; text-transform: uppercase; letter-spacing: .1em;
    color: rgba(0,0,0,.55); margin: 0 0 3px !important; text-align: left !important; }
  .mm-agr-sign-name { font-size: 13.5px !important; margin: 0 !important; text-align: left !important; }
`

/**
 * Print from a blank window that contains only the agreement sheet.
 *
 * Printing the modal in place left black rims (dark overlay baked into the PDF)
 * and, before the print CSS fix, stacked the title onto later pages. A dedicated
 * document has nothing to fight: white paper, black type.
 */
function printAgreementSheet(sheet: HTMLElement) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=820,height=960')
  if (!w) {
    window.print()
    return
  }
  const title = AGREEMENT.title.replace(/</g, '')
  w.document.open()
  w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${title}</title><style>${PRINT_DOC_CSS}</style></head>
<body>${sheet.outerHTML}
<script>
window.onload = function () {
  setTimeout(function () {
    window.focus();
    window.print();
  }, 50);
};
window.onafterprint = function () { window.close(); };
<\/script>
</body></html>`)
  w.document.close()
}

export function AgreementDocument() {
  const print = () => {
    track('ContractPrint', 'contract_print', { source: 'contract' })
    const sheet = document.querySelector<HTMLElement>('.mm-agr-page')
    if (!sheet) {
      window.print()
      return
    }
    printAgreementSheet(sheet)
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
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
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
