// GET|POST /api/spots-sync — dostraja opis kanału na Telegramie do licznika
// miejsc z /thank-you.
//
// Wariant ZA SEKRETEM dla wywołań z zewnątrz i JEDYNA regularna droga tego
// syncu: harmonogram stoi w zewnętrznym scenariuszu (Make), który uderza tutaj
// nagłówkiem `x-sync-key`. Publiczny api/spots-ping.js łapie tylko ruch
// z thank-you, więc bez tego endpointu opis stałby w godzinach bez odwiedzin.
//
// Za klucz, nie na otwarty ping, bo wywołanie z harmonogramu przychodzi zawsze
// z tego samego miejsca i nie ma powodu, żeby dobijało się nim cokolwiek innego.
//
// Cała logika siedzi w api/_lib/spots-sync-core.js — ten endpoint tylko pilnuje
// sekretu i deleguje.
//
// Wstęp tylko z nagłówkiem `x-sync-key` zgodnym ze zmienną SPOTS_SYNC_KEY.
// Token bota pochodzi WYŁĄCZNIE z TELEGRAM_BOT_TOKEN. Gate obejmuje też
// `?dry=1`, bo podgląd zdradza opis i chatId.

import { syncChannelDescription } from './_lib/spots-sync-core.js';

const TAG = '[spots-sync]';

// Ten sam wzorzec co w middleware.ts: porównanie w stałym czasie, żeby długość
// dopasowanego prefiksu nie była mierzalna z zewnątrz.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  const now = Date.now();
  res.setHeader('cache-control', 'no-store');

  const syncKey = process.env.SPOTS_SYNC_KEY;
  const givenKey = typeof req.headers['x-sync-key'] === 'string' ? req.headers['x-sync-key'].trim() : '';
  if (!syncKey || !givenKey || !timingSafeEqual(givenKey, syncKey)) {
    res.status(401).json({ ok: false, error: 'brak lub zły x-sync-key' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: 'brak TELEGRAM_BOT_TOKEN w środowisku' });
    return;
  }

  try {
    const result = await syncChannelDescription({
      token,
      now,
      dry: Boolean(req.query?.dry),
    });
    if (result.changed) console.log(`${TAG} ${result.n} miejsc — opis zaktualizowany`);
    res.status(200).json(result);
  } catch (err) {
    console.error(`${TAG} ${err.message}`);
    res.status(err.status === 403 || err.status === 400 ? 502 : 500).json({
      ok: false,
      error: err.message,
    });
  }
}
