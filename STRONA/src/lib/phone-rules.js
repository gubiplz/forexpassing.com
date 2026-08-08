// Forex Passing — jedna tabela reguł dla telefonu i handle'a Telegrama.
//
// ŹRÓDŁO PRAWDY dla trzech konsumentów:
//   • przeglądarka — formularz ankiety (ApplyFlow.tsx przez data/dial-codes.ts):
//     walidacja BLOKUJĄCA przed wysłaniem,
//   • funkcja Vercela — api/_lib/lead-quality.js: ocena leada na kanał i do panelu,
//   • api/event/subscribe.js: normalizacja handle'a przed zapisem.
//
// Wcześniej api/_lib/lead-quality.js trzymało własną kopię tabeli długości
// „bo API nie umie czytać TS-a" — i kopie się rozjechały (GB 10–10 kontra 9–10,
// DE 10–11 kontra 6–11…), więc poprawny brytyjski numer dostawał karę, a kara
// ścinała leada z high do warm i odbierała mu maila. Odkąd formularz BLOKUJE na
// tych widełkach, rozjazd kosztuje zgłoszenia, nie punkty — dlatego zwykły .js
// bez ani jednego importu, który wczyta i bundler Vite'a, i bundler funkcji
// (dokładnie ten sam manewr co src/lib/spots.js). Typy niesie JSDoc.

/* --------------------------------------------------------------------------
 * Długości numerów krajowych
 *
 * Widełki cyfr części KRAJOWEJ (bez kodu kierunkowego), po zdjęciu spacji
 * i myślników. Kanon = szersza z dwóch dotychczasowych tabel: szeroka granica
 * nigdy nie odrzuci numeru, który wąska by przepuściła, a łapie to, co ma
 * łapać — literówkę o cyfrę i wklejone pół numeru. Kraj spoza tabeli dostaje
 * GENERIC.
 * ------------------------------------------------------------------------ */

export const GENERIC = [6, 14];

/** @type {Record<string, [number, number]>} */
export const PHONE_DIGITS = {
  AL: [8, 9], DZ: [8, 9], AR: [10, 11], AU: [9, 9], AT: [7, 13], BH: [8, 8], BY: [9, 9],
  BE: [8, 9], BA: [8, 8], BR: [10, 11], BG: [8, 9], CA: [10, 10], CL: [9, 9], CN: [11, 11],
  CO: [10, 10], HR: [8, 9], CY: [8, 8], CZ: [9, 9], DK: [8, 8], EG: [9, 10], EE: [7, 8],
  FI: [6, 12], FR: [9, 9], GE: [9, 9], DE: [6, 11], GH: [9, 9], GR: [10, 10], HK: [8, 8],
  HU: [8, 9], IS: [7, 7], IN: [10, 10], ID: [9, 12], IE: [7, 9], IL: [8, 9], IT: [6, 11],
  JP: [9, 10], JO: [8, 9], KZ: [10, 10], KE: [9, 9], KW: [8, 8], LV: [8, 8], LB: [7, 8],
  LT: [8, 8], LU: [8, 9], MY: [9, 10], MT: [8, 8], MX: [10, 10], MD: [8, 8], ME: [8, 8],
  MA: [9, 9], NL: [9, 9], NZ: [8, 10], NG: [10, 10], MK: [8, 8], NO: [8, 8], OM: [8, 8],
  PK: [10, 10], PE: [9, 9], PH: [10, 10], PL: [9, 9], PT: [9, 9], QA: [8, 8], RO: [9, 9],
  RU: [10, 10], SA: [9, 9], RS: [8, 9], SG: [8, 8], SK: [9, 9], SI: [8, 8], ZA: [9, 9],
  KR: [9, 10], ES: [9, 9], SE: [7, 13], CH: [9, 9], TH: [9, 9], TN: [8, 8], TR: [10, 10],
  UA: [9, 9], AE: [8, 9], GB: [9, 10], US: [10, 10], VN: [9, 10],
};

/**
 * Kod kierunkowy per kraj — z plusem. Osobno od listy w data/dial-codes.ts,
 * bo tamta niesie też nazwy i flagi (rzeczy czysto frontowe); tu jest dokładnie
 * to, czego potrzebuje zdejmowanie prefiksu z wpisanego numeru.
 * @type {Record<string, string>}
 */
export const DIALS = {
  AL: '+355', DZ: '+213', AR: '+54', AU: '+61', AT: '+43', BH: '+973', BY: '+375',
  BE: '+32', BA: '+387', BR: '+55', BG: '+359', CA: '+1', CL: '+56', CN: '+86',
  CO: '+57', HR: '+385', CY: '+357', CZ: '+420', DK: '+45', EG: '+20', EE: '+372',
  FI: '+358', FR: '+33', GE: '+995', DE: '+49', GH: '+233', GR: '+30', HK: '+852',
  HU: '+36', IS: '+354', IN: '+91', ID: '+62', IE: '+353', IL: '+972', IT: '+39',
  JP: '+81', JO: '+962', KZ: '+7', KE: '+254', KW: '+965', LV: '+371', LB: '+961',
  LT: '+370', LU: '+352', MY: '+60', MT: '+356', MX: '+52', MD: '+373', ME: '+382',
  MA: '+212', NL: '+31', NZ: '+64', NG: '+234', MK: '+389', NO: '+47', OM: '+968',
  PK: '+92', PE: '+51', PH: '+63', PL: '+48', PT: '+351', QA: '+974', RO: '+40',
  RU: '+7', SA: '+966', RS: '+381', SG: '+65', SK: '+421', SI: '+386', ZA: '+27',
  KR: '+82', ES: '+34', SE: '+46', CH: '+41', TH: '+66', TN: '+216', TR: '+90',
  UA: '+380', AE: '+971', GB: '+44', US: '+1', VN: '+84',
};

/**
 * Kody dzielone przez kilka krajów: kogo wybrać, gdy numer mówi tylko „+1".
 * Oferta idzie po angielsku głównie do USA, a Rosja jest ludniejsza od
 * Kazachstanu — ten sam rachunek co FALLBACK_ISO w data/dial-codes.ts.
 * @type {Record<string, string>}
 */
export const DIAL_PRIMARY = { '+1': 'US', '+7': 'RU' };

// Telegram: 5–32 znaki, litery/cyfry/podkreślnik, start od litery, @ opcjonalne.
export const TELEGRAM_RE = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;

/**
 * Widełki długości dla kraju, z GENERIC w odwodzie.
 * @param {string | undefined | null} iso
 * @returns {[number, number]}
 */
export function boundsFor(iso) {
  return PHONE_DIGITS[String(iso ?? '').toUpperCase()] ?? GENERIC;
}

/**
 * Same cyfry części krajowej. Zero wiodące schodzi WYŁĄCZNIE jako naprawa:
 * gdy z nim numer nie mieści się w widełkach kraju, a bez niego się mieści.
 * Są kraje (np. Włochy), gdzie zero NALEŻY do numeru — zdjęte na ślepo robiło
 * z poprawnego numeru rzymskiego „za krótki". Bez podanego kraju zostaje stare
 * zachowanie (zdejmij nawykowe zera), bo wtedy nie ma czym mierzyć.
 * @param {string | undefined | null} raw
 * @param {string} [iso]
 * @returns {string}
 */
export function nationalDigits(raw, iso) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return d;
  if (iso === undefined) return d.replace(/^0+/, '');
  const [min, max] = boundsFor(iso);
  const pasuje = (s) => s.length >= min && s.length <= max;
  const bezZer = d.replace(/^0+/, '');
  if (!pasuje(d) && d.startsWith('0') && pasuje(bezZer)) return bezZer;
  return d;
}

/**
 * Numer wpisany od kodu kierunkowego („+48 601…", „0048601…") → rozbiór na
 * kraj i resztę. Najdłuższe dopasowanie wygrywa (+355 przed +35...), a przy
 * kodzie dzielonym decyduje DIAL_PRIMARY. Zwraca null, gdy nic nie pasuje —
 * wtedy wpis traktujemy jak zwykłą część krajową.
 * @param {string | undefined | null} raw
 * @returns {{ iso: string, dial: string, rest: string } | null}
 */
export function splitDial(raw) {
  let s = String(raw ?? '').trim();
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) return null;
  const cyfry = s.slice(1).replace(/\D/g, '');
  let best = null;
  for (const [iso, dial] of Object.entries(DIALS)) {
    const kod = dial.slice(1);
    if (!cyfry.startsWith(kod)) continue;
    const lepszy = !best
      || kod.length > best.dial.length - 1
      || (dial === best.dial && DIAL_PRIMARY[dial] === iso);
    if (lepszy) best = { iso, dial, rest: cyfry.slice(kod.length) };
  }
  return best;
}

/**
 * Handle Telegrama tak, jak wpisują go ludzie → sama nazwa użytkownika.
 * Zdejmuje @, wyciąga nazwę z linku t.me/telegram.me, ścina interpunkcję
 * doklejoną na końcu. NIE zgaduje niczego w środku: „gubi please" zostaje
 * jak jest i po prostu nie przechodzi TELEGRAM_RE — panel pokaże surowy wpis.
 * @param {string | undefined | null} raw
 * @returns {string}
 */
export function normalizeTelegram(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const link = s.match(/(?:t(?:elegram)?\.me|telegram\.dog)\/@?([A-Za-z0-9_]+)/i);
  if (link) return link[1];
  return s.replace(/^@+/, '').replace(/[\s,.;:!?]+$/g, '');
}
