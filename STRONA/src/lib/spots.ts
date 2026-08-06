// Forex Passing — jedna doba, jedna liczba wolnych miejsc.
//
// ŹRÓDŁO PRAWDY dla licznika miejsc. Czytają go dwa niezależne światy:
//   • przeglądarka — /thank-you (ThankYouPage.tsx): czerwony pas i alert,
//   • Node — bin/sync-telegram-spots.mjs: opis kanału na Telegramie.
//
// Dlatego nie ma tu Reacta, DOM-u ani żadnego importu: Node wczytuje ten .ts
// wprost (type stripping), więc oba miejsca liczą TĘ SAMĄ liczbę TYM SAMYM
// kodem. Gdyby sync dostał własną kopię wzoru, prędzej czy później rozjechałby
// się ze stroną — a to jedyna rzecz, której ten licznik nie może zrobić.
//
// Warunek, żeby to działało: plik musi zostać wymazywalny (`erasableSyntaxOnly`
// w tsconfig.app.json pilnuje tego dla całego src). Bez enumów, namespace'ów i
// pól konstruktora — Node ich nie usunie i sync padnie przy imporcie.

/* --------------------------------------------------------------------------
 * Doba nowojorska
 *
 * Granicą jest PÓŁNOC CZASU NOWOJORSKIEGO — koniec dnia w USA, a zarazem 6:00
 * rano w Polsce. Ta godzina trzyma się przez cały rok, bo obie strefy
 * przestawiają zegary w tym samym kierunku: latem północ ET = 04:00 UTC =
 * 06:00 CEST, zimą północ ET = 05:00 UTC = 06:00 CET.
 * ------------------------------------------------------------------------ */

export const OFFER_TZ = 'America/New_York'

// Formatter budowany raz — to jego konstrukcja jest kosztowna, nie samo
// formatowanie, a strona woła go co sekundę.
const OFFER_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: OFFER_TZ,
  hourCycle: 'h23', // bez tego północ potrafi sformatować się jako 24
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** Ile sekund doby upłynęło już w Nowym Jorku. */
export function etSecondsOfDay(ms: number) {
  const parts = OFFER_FMT.formatToParts(ms)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 3600 + get('minute') * 60 + get('second')
}

/** Najbliższa północ w Nowym Jorku, w milisekundach epoki. */
export function nextEtMidnight(now: number) {
  const guess = now + (86_400 - etSecondsOfDay(now)) * 1000
  // W dniu zmiany czasu doba ma 23 albo 25 godzin, więc przybliżenie „doba ma
  // 24 h" mija się z północą o godzinę. Dociągamy je do najbliższej: jeśli w
  // Nowym Jorku jest wtedy późny wieczór, brakuje reszty doby; jeśli wczesny
  // ranek — przestrzeliliśmy. Jedna korekta wystarcza, bo skok to zawsze godzina.
  const off = etSecondsOfDay(guess)
  if (off === 0) return guess
  return off > 43_200 ? guess + (86_400 - off) * 1000 : guess - off * 1000
}

/* --------------------------------------------------------------------------
 * Liczba wolnych miejsc
 *
 * ⚠ WYMYŚLONA PRESJA, nie rejestr niczego — patrz komentarz nad
 * TYP_SPOTS_BANNER w constants.ts. Wartość idzie z pory dnia, nie z żadnej
 * listy zapisów.
 *
 * Jedna funkcja dla czerwonego pasa, dla alertu i dla Telegrama, bo wcześniej
 * stały tam trzy różne liczby wpisane ręcznie — „7", „2" i „3" naraz.
 *
 * Ta sama doba, którą odlicza OfferCountdown: tuż po północy SPOTS_START, na
 * koniec doby SPOTS_END, potem reset razem z licznikiem. Liczone z zegara, więc
 * nie ma czego zapisywać ani uzgadniać między kartami i urządzeniami.
 * ------------------------------------------------------------------------ */

/** Znacznik podstawienia w tekstach z constants.ts. */
export const SPOTS_TOKEN = '{n}'
export const SPOTS_START = 7
export const SPOTS_END = 1
// Siedem wartości (7…1) na dobę, więc siedem przedziałów po ~3 h 26 min.
export const SPOTS_STEP = 86_400 / (SPOTS_START - SPOTS_END + 1)

export function spotsAt(now: number) {
  return Math.max(SPOTS_END, SPOTS_START - Math.floor(etSecondsOfDay(now) / SPOTS_STEP))
}

/** Najbliższa chwila, w której liczba się zmieni: kolejny próg albo północ. */
export function nextSpotsChange(now: number) {
  const elapsed = etSecondsOfDay(now)
  const prog = now + Math.ceil((Math.floor(elapsed / SPOTS_STEP) + 1) * SPOTS_STEP - elapsed) * 1000
  return Math.min(prog, nextEtMidnight(now))
}

/** Podstawia liczbę w każde wystąpienie `{n}`. */
export function fillSpots(template: string, n: number) {
  return template.split(SPOTS_TOKEN).join(String(n))
}
