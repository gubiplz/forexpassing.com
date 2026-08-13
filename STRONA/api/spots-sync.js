// GET|POST /api/spots-sync — dostraja opis kanału na Telegramie do licznika
// miejsc z /thank-you.
//
// Wołane z zewnętrznego budzika (scenariusz Make), bo liczba wynika z pory dnia
// w Nowym Jorku i nie ma zdarzenia, na które dałoby się zareagować. Cała logika
// siedzi tutaj, a nie w budziku — dzięki temu Make jest wymienialny i nie ma
// tam drugiej kopii wzoru, która mogłaby się rozjechać ze stroną.
//
// Harmonogram GitHub Actions próbowaliśmy pierwszy i NIE DZIAŁA na tym repo:
// `workflow_dispatch` odpala się bez pudła, ale event `schedule` nie odpalił się
// ani razu przez ponad dwie godziny — ani przy `*/5 * * * *`, ani przy rzadkim
// harmonogramie celującym w progi. Stąd budzik z zewnątrz.
//
// Bezstanowe i idempotentne: czyta żywy opis, składa docelowy i wysyła tylko
// przy różnicy. Pominięte wywołanie niczego nie psuje — nadrabia następne.
//
// Wstęp tylko z nagłówkiem `x-sync-key` zgodnym ze zmienną SPOTS_SYNC_KEY.
// Wcześniej endpoint był otwarty i przyjmował token bota z nagłówka — obcy nie
// mógł ruszyć cudzego kanału (Telegram odrzuca nie-administratora), ale mógł
// palić limity naszego bota i triggerować zapisy. Teraz token bota pochodzi
// WYŁĄCZNIE z TELEGRAM_BOT_TOKEN, a budzik (scenariusz Make) uwierzytelnia się
// sekretem. Gate obejmuje też `?dry=1`, bo podgląd zdradza opis i chatId.

import {
  channelDescriptionAt,
  nextSpotsChange,
  TG_CHANNEL_CHAT_ID,
  TG_DESCRIPTION_MAX,
} from '../src/lib/spots.js';

const TAG = '[spots-sync]';

// Ten sam wzorzec co w middleware.ts: porównanie w stałym czasie, żeby długość
// dopasowanego prefiksu nie była mierzalna z zewnątrz.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Jedno wywołanie Bot API. Rzuca z czytelnym powodem zamiast gołego statusu. */
async function tg(token, method, params) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) {
    const err = new Error(`${method}: ${body.description ?? res.status}`);
    err.status = res.status;
    throw err;
  }
  return body.result;
}

export default async function handler(req, res) {
  const now = Date.now();

  // Nie chcemy, żeby budzik dostał odpowiedź z pośredniego cache'u i uznał, że
  // zrobił swoje.
  res.setHeader('cache-control', 'no-store');

  // Zamek na drzwiach. Bez ustawionego SPOTS_SYNC_KEY endpoint jest zamknięty
  // na głucho — brak sekretu w env to stan „nie skonfigurowano", nie „otwarte".
  const syncKey = process.env.SPOTS_SYNC_KEY;
  const givenKey = typeof req.headers['x-sync-key'] === 'string' ? req.headers['x-sync-key'].trim() : '';
  if (!syncKey || !givenKey || !timingSafeEqual(givenKey, syncKey)) {
    res.status(401).json({ ok: false, error: 'brak lub zły x-sync-key' });
    return;
  }

  const { n, description } = channelDescriptionAt(now);
  const chatId = process.env.TELEGRAM_SPOTS_CHAT_ID || TG_CHANNEL_CHAT_ID;

  if (description.length > TG_DESCRIPTION_MAX) {
    res.status(500).json({ ok: false, error: `opis ma ${description.length} znaków, limit ${TG_DESCRIPTION_MAX}` });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  // Podgląd: co byłoby wysłane i czy w ogóle jest czym. `hasEnvToken` mówi
  // tylko tak/nie — sam token nigdy nie wychodzi z serwera.
  if (req.query?.dry) {
    res.status(200).json({
      ok: true,
      dry: true,
      n,
      description,
      chatId,
      hasEnvToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      nextChangeAt: new Date(nextSpotsChange(now)).toISOString(),
    });
    return;
  }

  if (!token) {
    res.status(500).json({ ok: false, error: 'brak TELEGRAM_BOT_TOKEN w środowisku' });
    return;
  }

  try {
    const chat = await tg(token, 'getChat', { chat_id: chatId });
    const have = chat.description ?? '';

    if (have === description) {
      res.status(200).json({ ok: true, n, changed: false, description });
      return;
    }

    await tg(token, 'setChatDescription', { chat_id: chatId, description });

    // „ok: true" mówi tylko, że żądanie przeszło — czytamy z powrotem.
    const after = (await tg(token, 'getChat', { chat_id: chatId })).description ?? '';
    if (after !== description) {
      throw new Error('po zapisie opis nadal się nie zgadza');
    }

    console.log(`${TAG} ${n} miejsc — opis zaktualizowany`);
    res.status(200).json({ ok: true, n, changed: true, was: have, description });
  } catch (err) {
    // Komunikaty Telegrama nie niosą tokenu, ale nie ryzykujemy: do odpowiedzi
    // idzie tylko powód, nigdy adres wywołania.
    console.error(`${TAG} ${err.message}`);
    res.status(err.status === 403 || err.status === 400 ? 502 : 500).json({ ok: false, n, error: err.message });
  }
}
