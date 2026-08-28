// Skąd przyszedł człowiek, który wypełnił formularz.
//
// Dotąd landing nie wysyłał tego wcale, więc raport po drugiej stronie umiał
// odpowiedzieć „ilu leadów", nigdy „z której kampanii" — a budżet reklamowy
// dzieli się właśnie po tym drugim.
//
// Trzy identyfikatory kliknięcia, nie jeden: warstwa brzegowa rozpoznaje
// fbclid, gclid i ttclid (workers/lib/click-tracker.ts), czyli ruch płatny
// przychodzi z trzech sieci. Parkowanie samego fbclid zostawiłoby dwie z nich
// bez odpowiedzi, a kosztuje to jedną pozycję na liście poniżej.
const POLA = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'fbclid',
  'gclid',
  'ttclid',
] as const

// Ten sam magazyn i to samo życie co `fp_ref` obok. Partner i kampania
// odpowiadają na jedno pytanie — „kto go przyprowadził" — a gdyby jedno
// przeżywało zamknięcie karty, a drugie nie, wspólnego raportu nie dałoby się
// wytłumaczyć. Człowiek klika reklamę i wraca wypełnić formularz nazajutrz;
// sessionStorage gubi dokładnie ten przypadek.
const KLUCZ = 'fp_attr'

/** Zapamiętuje kampanię z adresu, jeśli adres jakąś niesie. */
export function parkAttribution(): void {
  try {
    const q = new URLSearchParams(window.location.search)
    const znalezione: Record<string, string> = {}
    for (const pole of POLA) {
      const v = q.get(pole)?.trim()
      if (v) znalezione[pole] = v.slice(0, 120)
    }
    // Pusty adres nie kasuje tego, co już stoi. Inaczej powrót wprost na stronę
    // zerowałby kampanię, z której ten sam człowiek przyszedł wczoraj — a to
    // ona go przyprowadziła i to ona ma dostać ten lead na swoje konto.
    if (Object.keys(znalezione).length) {
      window.localStorage.setItem(KLUCZ, JSON.stringify(znalezione))
    }
  } catch {
    // Tryb prywatny albo storage wyłączony — atrybucja jest best-effort, tak
    // samo jak `fp_ref`. Formularz ma działać bez niej.
  }
}

/** Sparkowana kampania, albo pusty obiekt dla ruchu bez oznaczenia. */
export function readAttribution(): Record<string, string> {
  try {
    const surowe = window.localStorage.getItem(KLUCZ)
    const wartosc = surowe ? JSON.parse(surowe) : null
    return wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc) ? wartosc : {}
  } catch {
    return {}
  }
}
