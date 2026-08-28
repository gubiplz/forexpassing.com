import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { parkAttribution } from './lib/attribution'

// Przed pierwszym renderem i poza jakąkolwiek podstroną: parametry kampanii są
// w pasku adresu tylko przy wejściu, a formularz bywa wypełniany kwadrans
// później i gdzie indziej. `fp_ref` parkuje się dziś wyłącznie na /meta —
// tutaj chodzi o każde wejście, bo reklamy prowadzą też na /freeaccount.
parkAttribution()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
