// Sprawdza, dlaczego lead nie trafia do arkusza Google.
//
//   node bin/check-sheets.mjs --key ~/Downloads/klucz.json --sheet <ID_ARKUSZA>
//   node bin/check-sheets.mjs --key ~/Downloads/klucz.json --sheet <ID> --write
//
// Bez --write nic nie zapisuje: przechodzi tę samą drogę co produkcja aż do
// momentu przed dopisaniem wiersza i mówi, na którym kroku się wywala. Z --write
// dopisuje jeden wiersz testowy, oznaczony tak, żeby dało się go potem znaleźć
// i usunąć.
//
// Używa api/_lib/sheets.js, a nie własnej kopii podpisywania JWT. Diagnostyka,
// która działa inaczej niż to, co diagnozuje, potrafi powiedzieć "wszystko OK"
// przy zepsutej produkcji — a to jedyny błąd, na który nie można sobie tu
// pozwolić.
//
// ID arkusza podaje się z ręki albo przez LEADS_SHEET_ID. Nie ma go w repo i nie
// powinno być: repozytorium jest publiczne, a arkusz jest udostępniony po linku,
// więc wpisanie tego identyfikatora do kodu wystawiłoby dane kandydatów na
// widok publiczny. Klucz prywatny tym bardziej zostaje na dysku.

import { readFileSync } from 'node:fs';
import { accessToken, HEADERS } from '../api/_lib/sheets.js';

const DEFAULT_GID = 687993626;

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

let step = 0;
const info = (msg) => console.log(`\n${++step}. ${msg}`);
const good = (msg) => console.log(`   OK   ${msg}`);
const bad = (msg, fix) => {
  console.log(`   BŁĄD ${msg}`);
  if (fix) console.log(`\n   Co zrobić: ${fix}\n`);
  process.exit(1);
};

// --- poświadczenia -----------------------------------------------------------

let email = process.env.GOOGLE_SA_EMAIL;
let key = process.env.GOOGLE_SA_KEY;

const keyPath = arg('key');
if (keyPath) {
  let json;
  try {
    json = JSON.parse(readFileSync(keyPath.replace(/^~/, process.env.HOME), 'utf8'));
  } catch (err) {
    bad(
      `nie umiem odczytać ${keyPath} (${String(err.message).slice(0, 80)})`,
      'podaj ścieżkę do pliku JSON pobranego z Google Cloud → Service Accounts → Keys.'
    );
  }
  email = json.client_email;
  key = json.private_key;
  if (!email || !key) {
    bad(
      'w tym pliku nie ma pól client_email / private_key',
      'to musi być klucz konta serwisowego (typ "service_account"), nie plik OAuth klienta.'
    );
  }
}

const sheet = arg('sheet') || process.env.LEADS_SHEET_ID;
const gid = Number(arg('gid') ?? process.env.LEADS_SHEET_GID ?? DEFAULT_GID);

if (!email || !key) {
  bad(
    'brak poświadczeń',
    'użyj --key <plik.json> albo ustaw GOOGLE_SA_EMAIL i GOOGLE_SA_KEY.'
  );
}
if (!sheet) {
  bad(
    'brak identyfikatora arkusza',
    'użyj --sheet <ID> albo ustaw LEADS_SHEET_ID. ID to część adresu między /d/ a /edit.'
  );
}

info('Poświadczenia');
good(`konto serwisowe: ${email}`);
good(`arkusz: ${sheet}`);
good(`zakładka (gid): ${gid}`);

// --- token -------------------------------------------------------------------

info('Wymiana klucza na token dostępu');
let token;
try {
  token = await accessToken(email, key);
  good('Google przyjął podpisany JWT');
} catch (err) {
  const msg = String(err.message ?? err);
  if (/DECODER|unsupported|PEM/i.test(msg)) {
    bad(
      'klucz prywatny nie daje się wczytać',
      'do GOOGLE_SA_KEY wklej WYŁĄCZNIE wartość pola "private_key" z pliku JSON — ' +
        'razem z liniami BEGIN/END, ale bez reszty JSON-a i bez zewnętrznych cudzysłowów.'
    );
  }
  if (/invalid_grant/i.test(msg)) {
    bad(
      'Google odrzucił podpis (invalid_grant)',
      'najczęściej klucz został usunięty w konsoli albo pochodzi z innego konta serwisowego. ' +
        'Wygeneruj nowy klucz JSON i użyj go w całości.'
    );
  }
  bad(`nie udało się pobrać tokenu: ${msg.slice(0, 200)}`);
}

// --- dostęp do arkusza -------------------------------------------------------

info('Dostęp do arkusza');
const meta = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}` +
    '?fields=properties.title,sheets.properties(sheetId,title)',
  { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
);

if (!meta.ok) {
  const text = (await meta.text()).slice(0, 400);
  if (meta.status === 403 && /has not been used|disabled/i.test(text)) {
    bad(
      'Google Sheets API nie jest włączone w tym projekcie',
      'console.cloud.google.com → APIs & Services → Library → "Google Sheets API" → Enable. ' +
        'Po włączeniu odczekaj minutę.'
    );
  }
  if (meta.status === 403) {
    bad(
      'konto serwisowe nie ma dostępu do tego arkusza',
      `otwórz arkusz → Udostępnij → dodaj ${email} jako Edytor. ` +
        'Konto serwisowe to osobna tożsamość, samo udostępnienie po linku mu nie wystarcza do zapisu.'
    );
  }
  if (meta.status === 404) {
    bad(
      'nie ma arkusza o takim identyfikatorze',
      'sprawdź --sheet: to część adresu między /d/ a /edit, bez /edit i bez #gid.'
    );
  }
  bad(`Google odpowiedział ${meta.status}: ${text}`);
}

const { properties, sheets } = await meta.json();
good(`plik: „${properties.title}"`);

const tab = sheets.find((s) => s.properties.sheetId === gid);
if (!tab) {
  bad(
    `w tym pliku nie ma zakładki o gid ${gid}`,
    'dostępne zakładki: ' +
      sheets.map((s) => `„${s.properties.title}" (gid ${s.properties.sheetId})`).join(', ') +
      '. Ustaw LEADS_SHEET_GID na właściwy.'
  );
}
good(`zakładka: „${tab.properties.title}"`);

// --- nagłówki ----------------------------------------------------------------

info('Nagłówki');
const head = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}/values/` +
    `${encodeURIComponent(`'${tab.properties.title}'!A1:T1`)}`,
  { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }
);
const live = head.ok ? ((await head.json()).values?.[0] ?? []) : [];
const mismatch = HEADERS.filter((h, i) => live[i] !== h);
if (mismatch.length) {
  console.log(`   UWAGA kolumny nie zgadzają się z kodem: ${mismatch.join(', ')}`);
  console.log(`   w arkuszu: ${live.join(', ') || '(pusto)'}`);
  console.log('   Dane i tak się zapiszą, ale wylądują pod złymi nagłówkami.');
} else {
  good(`wszystkie ${HEADERS.length} kolumn zgodnych z kodem`);
}

// --- zapis próbny ------------------------------------------------------------

if (!flag('write')) {
  console.log(
    '\nKonfiguracja jest poprawna. Nic nie zapisano — dodaj --write, żeby dopisać wiersz testowy.\n'
  );
  process.exit(0);
}

info('Zapis wiersza testowego');
process.env.GOOGLE_SA_EMAIL = email;
process.env.GOOGLE_SA_KEY = key;
process.env.LEADS_SHEET_ID = sheet;
process.env.LEADS_SHEET_GID = String(gid);

const { appendLeadToSheet } = await import('../api/_lib/sheets.js');
const written = await appendLeadToSheet({
  ts: Date.now(),
  name: 'TEST — check-sheets.mjs',
  email: 'test@example.com',
  phone: '',
  phoneIso: '',
  telegram: '',
  outcome: 'qualified',
  source: 'test',
  ref: '',
  ip: '',
  answers: {},
  quality: null,
});

if (!written) bad('zapis się nie udał — powód jest w logu [sheets] powyżej');
good('wiersz dopisany');
console.log('\nSprawdź arkusz i usuń wiersz „TEST — check-sheets.mjs".\n');
