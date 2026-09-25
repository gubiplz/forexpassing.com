import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { parkAttribution } from './lib/attribution'

// Przed pierwszym renderem i poza jakąkolwiek podstroną: parametry kampanii są
// w pasku adresu tylko przy wejściu, a formularz bywa wypełniany kwadrans
// później i gdzie indziej. Tu też parkuje się `fp_ref` z linku partnera —
// przy każdym wejściu, bo reklamy prowadzą też na /freeaccount, a werdykt
// „human", od którego zależy MoneyPage, zapada dopiero później.
parkAttribution()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
