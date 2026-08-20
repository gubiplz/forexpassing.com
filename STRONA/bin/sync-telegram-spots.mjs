// Trzyma opis kanału na Telegramie zgodny z licznikiem miejsc na /thank-you.
//
//   node bin/sync-telegram-spots.mjs             # policz i dostrój opis
//   node bin/sync-telegram-spots.mjs --dry-run   # tylko pokaż, nic nie wysyłaj
//   node bin/sync-telegram-spots.mjs --dry-run --at=2026-08-10T18:30:00Z
//
// Uruchamiany z crona w .github/workflows/telegram-spots.yml. Liczbę bierze z
// src/lib/spots.ts — z TEGO SAMEGO pliku, który renderuje pas i alert na
// stronie. To jedyny powód, dla którego opis kanału może być z nią zgodny co do
// sztuki: nie ma tu przepisanego wzoru, który mógłby się rozjechać.
//
// Skrypt jest BEZSTANOWY i samonaprawiający: czyta, co faktycznie stoi na
// kanale, podmienia w tym tekście SAMĄ liczbę przed „remaining" i wysyła tylko
// przy różnicy. Reszta opisu należy do admina — szablon z spots.js wchodzi
// dopiero, gdy w opisie nie ma licznika. Nie pamięta poprzedniego uruchomienia,
// więc nie ma czego zgubić ani rozjechać — pominięty przebieg nadrabia
// następny. Wysyłek wychodzi ~7 na dobę, tyle ile progów licznika.
//
// TELEGRAM_BOT_TOKEN idzie WYŁĄCZNIE ze zmiennej środowiskowej (w CI: sekret
// repozytorium). Repo jest publiczne — token nie ma prawa się w nim znaleźć.

import { appendFileSync } from 'node:fs';

import {
  channelDescriptionAt,
  SPOTS_TOKEN,
  swapSpotsNumber,
  TG_CHANNEL_CHAT_ID,
  TG_CHANNEL_DESCRIPTION,
  TG_DESCRIPTION_MAX,
} from '../src/lib/spots.js';

const TAG = '[telegram-spots]';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Domyślnie publiczny uchwyt kanału; ID liczbowe też przejdzie. Ta sama nazwa
// zmiennej co w api/spots-sync.js — dwie nazwy na to samo kończą się tym, że
// jedna z nich pokazuje na cudzy kanał.
const CHAT = process.env.TELEGRAM_SPOTS_CHAT_ID || TG_CHANNEL_CHAT_ID;
// Telegram tnie opis czatu na 255 znakach — po cichu, bez błędu.
const MAX_LEN = TG_DESCRIPTION_MAX;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const atArg = args.find((a) => a.startsWith('--at='));

const die = (msg) => {
  console.error(`${TAG} ${msg}`);
  process.exit(1);
};

// Gdyby fetch wyrzucił błąd z adresem w treści, token pojechałby do publicznego
// logu CI. GitHub maskuje zarejestrowane sekrety, ale nie polegamy na tym.
const scrub = (s) => (TOKEN ? String(s).split(TOKEN).join('<TOKEN>') : String(s));

if (!TOKEN) die('brak TELEGRAM_BOT_TOKEN w środowisku.');
// „Policz na inną godzinę" i „wyślij" razem to prosta droga do wpisania na
// kanał liczby z zupełnie innej pory doby. Rozdzielamy to twardo.
if (atArg && !dryRun) die('--at wolno używać tylko razem z --dry-run.');

const now = atArg ? Date.parse(atArg.slice('--at='.length)) : Date.now();
if (Number.isNaN(now)) die(`--at nie jest datą: ${atArg}`);

/** Jedno wywołanie Bot API. Zwraca `result` albo kończy proces. */
async function tg(method, params) {
  const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    die(`${method}: sieć padła — ${scrub(err?.message ?? err)}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!body.ok) {
    die(`${method}: ${res.status} ${scrub(body.description ?? '(bez opisu)')}`);
  }
  return body.result;
}

// ── fallback z szablonu ──────────────────────────────────────────────────────
if (!TG_CHANNEL_DESCRIPTION.includes(SPOTS_TOKEN)) {
  die(`TG_CHANNEL_DESCRIPTION nie zawiera ${SPOTS_TOKEN} — nie ma czego podstawić.`);
}

const { n, description: fallback } = channelDescriptionAt(now);

// ── co faktycznie stoi na kanale ───────────────────────────────────────────
const chat = await tg('getChat', { chat_id: CHAT });
const have = chat.description ?? '';

// Tekst opisu należy do admina — podmieniamy w nim samą liczbę. Szablon
// wchodzi dopiero, gdy w opisie nie ma licznika „N remaining".
const want = swapSpotsNumber(have, n) ?? fallback;

if (want.length > MAX_LEN) {
  die(`opis ma ${want.length} znaków, Telegram przyjmie ${MAX_LEN}.`);
}

console.log(`${TAG} kanał: ${chat.title} (${chat.id})`);
console.log(`${TAG} miejsc teraz: ${n}`);

if (have === want) {
  console.log(`${TAG} opis już zgodny — nic nie wysyłam.`);
  summary(`✅ zgodne · ${n} miejsc`, want);
  process.exit(0);
}

console.log(`${TAG} rozjazd: ${swapSpotsNumber(have, n) ? 'sama liczba' : 'BRAK LICZNIKA W OPISIE — wstawiam szablon z spots.js'}`);
console.log(`${TAG} było:  ${JSON.stringify(have)}`);
console.log(`${TAG} będzie: ${JSON.stringify(want)}`);

if (dryRun) {
  console.log(`${TAG} --dry-run: nic nie wysłano.`);
  process.exit(0);
}

await tg('setChatDescription', { chat_id: CHAT, description: want });

// Czytamy z powrotem, bo „ok: true" mówi tylko, że żądanie przeszło.
const after = (await tg('getChat', { chat_id: CHAT })).description ?? '';
if (after !== want) {
  die(`po zapisie opis nadal się nie zgadza: ${JSON.stringify(after)}`);
}
console.log(`${TAG} zapisane i potwierdzone.`);
summary(`✍️ zaktualizowane · ${n} miejsc`, want);

/** Jedna linijka do podsumowania joba, żeby stan było widać bez wchodzenia w log. */
function summary(status, text) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const stamp = new Date(now).toISOString().replace('T', ' ').slice(0, 19);
  appendFileSync(file, `**${status}** — ${stamp} UTC\n\n> ${text.replace(/\n+/g, ' · ')}\n`);
}
