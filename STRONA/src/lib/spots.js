// Forex Passing — jedna doba, jedna liczba wolnych miejsc.
//
// ŹRÓDŁO PRAWDY dla licznika miejsc. Czytają go TRZY niezależne światy:
//   • przeglądarka — /thank-you (ThankYouPage.tsx): czerwony pas i alert,
//   • funkcja Vercela — api/spots-sync.js: opis kanału na Telegramie,
//   • Node z linii poleceń — bin/sync-telegram-spots.mjs: to samo, ręcznie.
//
// Dlatego to ZWYKŁY .js bez ani jednego importu: taki plik wczytuje każdy z
// nich bez budowania i bez konfiguracji. Wcześniej był to `.ts` i działało to
// tylko dzięki type strippingowi Node'a — ale bundler funkcji na Vercelu to
// osobny świat, a jedna liczba nie jest warta ryzyka, że któryś z trzech
// konsumentów przestanie umieć ją przeczytać. Typy niesie JSDoc, więc strona
// dalej dostaje podpowiedzi.
//
// Gdyby którykolwiek konsument dostał własną kopię wzoru, prędzej czy później
// rozjechałby się z tym, co widzi człowiek na stronie — a to jedyna rzecz,
// której ten licznik nie może zrobić.

/* --------------------------------------------------------------------------
 * Doba nowojorska
 *
 * Granicą jest PÓŁNOC CZASU NOWOJORSKIEGO — koniec dnia w USA, a zarazem 6:00
 * rano w Polsce. Ta godzina trzyma się przez cały rok, bo obie strefy
 * przestawiają zegary w tym samym kierunku: latem północ ET = 04:00 UTC =
 * 06:00 CEST, zimą północ ET = 05:00 UTC = 06:00 CET.
 * ------------------------------------------------------------------------ */

export const OFFER_TZ = 'America/New_York';

// Formatter budowany raz — to jego konstrukcja jest kosztowna, nie samo
// formatowanie, a strona woła go co sekundę.
const OFFER_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: OFFER_TZ,
  hourCycle: 'h23', // bez tego północ potrafi sformatować się jako 24
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Ile sekund doby upłynęło już w Nowym Jorku.
 * @param {number} ms milisekundy epoki
 * @returns {number}
 */
export function etSecondsOfDay(ms) {
  const parts = OFFER_FMT.formatToParts(ms);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get('hour') * 3600 + get('minute') * 60 + get('second');
}

/**
 * Najbliższa północ w Nowym Jorku, w milisekundach epoki.
 * @param {number} now
 * @returns {number}
 */
export function nextEtMidnight(now) {
  const guess = now + (86_400 - etSecondsOfDay(now)) * 1000;
  // W dniu zmiany czasu doba ma 23 albo 25 godzin, więc przybliżenie „doba ma
  // 24 h" mija się z północą o godzinę. Dociągamy je do najbliższej: jeśli w
  // Nowym Jorku jest wtedy późny wieczór, brakuje reszty doby; jeśli wczesny
  // ranek — przestrzeliliśmy. Jedna korekta wystarcza, bo skok to zawsze godzina.
  const off = etSecondsOfDay(guess);
  if (off === 0) return guess;
  return off > 43_200 ? guess + (86_400 - off) * 1000 : guess - off * 1000;
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
export const SPOTS_TOKEN = '{n}';
export const SPOTS_START = 7;
export const SPOTS_END = 1;
// Siedem wartości (7…1) na dobę, więc siedem przedziałów po ~3 h 26 min.
export const SPOTS_STEP = 86_400 / (SPOTS_START - SPOTS_END + 1);

/**
 * @param {number} now milisekundy epoki
 * @returns {number} ile miejsc „zostało" w tej chwili
 */
export function spotsAt(now) {
  return Math.max(SPOTS_END, SPOTS_START - Math.floor(etSecondsOfDay(now) / SPOTS_STEP));
}

/**
 * Najbliższa chwila, w której liczba się zmieni: kolejny próg albo północ.
 * @param {number} now
 * @returns {number}
 */
export function nextSpotsChange(now) {
  const elapsed = etSecondsOfDay(now);
  const prog = now + Math.ceil((Math.floor(elapsed / SPOTS_STEP) + 1) * SPOTS_STEP - elapsed) * 1000;
  return Math.min(prog, nextEtMidnight(now));
}

/**
 * Podstawia liczbę w każde wystąpienie `{n}`.
 * @param {string} template
 * @param {number} n
 * @returns {string}
 */
export function fillSpots(template, n) {
  return template.split(SPOTS_TOKEN).join(String(n));
}

/* --------------------------------------------------------------------------
 * Opis kanału na Telegramie
 *
 * Tekst mieszka TUTAJ, a nie w constants.ts, bo czyta go funkcja serverless i
 * skrypt CLI — a constants.ts jest modułem przeglądarki. Zdanie jest
 * nierozłączne z licznikiem: to jego jedyne zastosowanie.
 *
 * WŁAŚCICIELEM TEKSTU JEST KANAŁ, nie repo. Sync podmienia w żywym opisie
 * wyłącznie liczbę przed „remaining" (swapSpotsNumber) — admin może dowolnie
 * redagować resztę opisu w apce i sync jej nie ruszy. Szablon poniżej to
 * FALLBACK: wchodzi dopiero, gdy w opisie nie ma licznika (np. ktoś wyczyścił
 * opis do zera) — bez niego pusty kanał zostałby pusty na zawsze.
 *
 * Telegram tnie opis na 255 znakach — konsumenci sprawdzają to przed wysyłką
 * i wolą się wywalić, niż wysłać obcięty tekst.
 *
 * ⚠ „10" jest wpisane na sztywno i NIE jest tą samą liczbą co licznik: pula
 * dzienna to 10, a licznik startuje od SPOTS_START = 7. Czyta się to jako „z 10
 * miejsc zostało {n}", więc nie jest sprzeczne, ale o północy opis pokaże
 * „(7 remaining)", nie „(10 remaining)". Żeby obie liczby wychodziły z jednego
 * miejsca, wystarczy wpisać tu 7 albo podnieść SPOTS_START do 10.
 * ------------------------------------------------------------------------ */

/** Uchwyt zespołu — ten sam co TELEGRAM_ADMIN_HANDLE w constants.ts. */
export const TG_ADMIN_HANDLE = '@fxpassingadmin';

/** Publiczny kanał, którego opis synchronizujemy. Jawny, nie jest sekretem. */
export const TG_CHANNEL_CHAT_ID = '@fx_passing';

export const TG_CHANNEL_DESCRIPTION =
  `If can not open, download telegram. Search ${TG_ADMIN_HANDLE} and message.\n\n` +
  `🚨 Only 10 people can join this group daily (${SPOTS_TOKEN} remaining)`;

/** Ile znaków przyjmie opis czatu w Telegramie. */
export const TG_DESCRIPTION_MAX = 255;

/**
 * Docelowy opis kanału na zadaną chwilę — jedno miejsce, w którym powstaje
 * tekst wysyłany do Telegrama, żeby konsumenci nie składali go każdy po swojemu.
 * @param {number} now milisekundy epoki
 * @returns {{ n: number, description: string }}
 */
export function channelDescriptionAt(now) {
  const n = spotsAt(now);
  return { n, description: fillSpots(TG_CHANNEL_DESCRIPTION, n) };
}

/**
 * Podmienia w ŻYWYM opisie kanału samą liczbę przed „remaining", zostawiając
 * resztę tekstu nietkniętą — to pozwala adminowi redagować opis w apce bez
 * walki z syncem. Dopasowanie jest celowo luźne (dowolna liczba, dowolne
 * odstępy, wielkość liter bez znaczenia), żeby przeredagowane zdanie wciąż
 * łapało licznik.
 * @param {string} text żywy opis z getChat
 * @param {number} n docelowa liczba miejsc
 * @returns {string | null} opis z podmienioną liczbą albo null, gdy w tekście
 *   nie ma licznika „N remaining" i trzeba sięgnąć po szablon
 */
export function swapSpotsNumber(text, n) {
  const re = /\d+(?=\s*remaining)/i;
  if (!re.test(text || '')) return null;
  return text.replace(re, String(n));
}
