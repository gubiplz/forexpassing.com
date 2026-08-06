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
// Token bota: nagłówek `x-telegram-token`, a jak go nie ma — zmienna
// środowiskowa TELEGRAM_BOT_TOKEN. Nagłówek ma pierwszeństwo, bo zmienna w
// projekcie służy dostawie leadów i nie musi należeć do bota, który jest
// administratorem kanału publicznego.
//
// Bez tokenu endpoint niczego nie zapisze, a `?dry=1` tylko pokazuje, co by
// wysłał. Kanał jest zaszyty po stronie serwera, więc obcy token nie pozwala
// ruszyć niczego cudzego — Telegram odrzuci go jako nie-administratora.

import {
  channelDescriptionAt,
  nextSpotsChange,
  TG_CHANNEL_CHAT_ID,
  TG_DESCRIPTION_MAX,
} from '../src/lib/spots.js';

const TAG = '[spots-sync]';

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
  const { n, description } = channelDescriptionAt(now);
  const chatId = process.env.TELEGRAM_SPOTS_CHAT_ID || TG_CHANNEL_CHAT_ID;

  // Nie chcemy, żeby budzik dostał odpowiedź z pośredniego cache'u i uznał, że
  // zrobił swoje.
  res.setHeader('cache-control', 'no-store');

  if (description.length > TG_DESCRIPTION_MAX) {
    res.status(500).json({ ok: false, error: `opis ma ${description.length} znaków, limit ${TG_DESCRIPTION_MAX}` });
    return;
  }

  const headerToken = req.headers['x-telegram-token'];
  const token = (typeof headerToken === 'string' && headerToken.trim()) || process.env.TELEGRAM_BOT_TOKEN;

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
    res.status(401).json({ ok: false, error: 'brak tokenu: nagłówek x-telegram-token albo TELEGRAM_BOT_TOKEN' });
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
