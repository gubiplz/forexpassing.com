// Wspólna logika dostrajania opisu kanału — używana przez:
//   • api/spots-sync.js  (sekret x-sync-key, np. Make)
//   • api/spots-ping.js  (publiczny, throttlowany, z thank-you + cron)
//
// Jedno miejsce na getChat → swap liczby → setChatDescription, żeby obie
// ścieżki nie rozjechały się w przyszłości.

import {
  channelDescriptionAt,
  nextSpotsChange,
  swapSpotsNumber,
  TG_CHANNEL_CHAT_ID,
  TG_DESCRIPTION_MAX,
} from '../../src/lib/spots.js';

/** Jedno wywołanie Bot API. Rzuca z czytelnym powodem zamiast gołego statusu. */
export async function tg(token, method, params) {
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

/**
 * Czyta żywy opis, podmienia liczbę przed „remaining" (albo wstawia szablon)
 * i opcjonalnie zapisuje. Zwraca pełny raport do odpowiedzi HTTP.
 *
 * @param {{ token: string, chatId?: string, now?: number, dry?: boolean }} opts
 */
export async function syncChannelDescription({ token, chatId, now = Date.now(), dry = false }) {
  const { n, description: fallback } = channelDescriptionAt(now);
  const id = chatId || process.env.TELEGRAM_SPOTS_CHAT_ID || TG_CHANNEL_CHAT_ID;

  const chat = await tg(token, 'getChat', { chat_id: id });
  const have = chat.description ?? '';
  const description = swapSpotsNumber(have, n) ?? fallback;

  if (description.length > TG_DESCRIPTION_MAX) {
    const err = new Error(`opis ma ${description.length} znaków, limit ${TG_DESCRIPTION_MAX}`);
    err.status = 500;
    throw err;
  }

  const wouldChange = have !== description;
  const nextChangeAt = new Date(nextSpotsChange(now)).toISOString();

  if (dry) {
    return {
      ok: true,
      dry: true,
      n,
      was: have,
      description,
      wouldChange,
      chatId: id,
      nextChangeAt,
    };
  }

  if (!wouldChange) {
    return { ok: true, n, changed: false, description, chatId: id, nextChangeAt };
  }

  await tg(token, 'setChatDescription', { chat_id: id, description });

  const after = (await tg(token, 'getChat', { chat_id: id })).description ?? '';
  if (after !== description) {
    throw new Error('po zapisie opis nadal się nie zgadza');
  }

  return { ok: true, n, changed: true, was: have, description, chatId: id, nextChangeAt };
}
