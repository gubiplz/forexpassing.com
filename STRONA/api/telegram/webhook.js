// POST /api/telegram/webhook — przyciski pod kartą leada działają w obie strony.
//
// Karta na czacie działu jest jedynym miejscem, w którym operator jest w chwili,
// gdy lead przychodzi. Jeżeli zmiana statusu wymaga otwarcia czegokolwiek
// innego, to się nie dzieje — i statusy leżą w arkuszu nieaktualne. Stąd te
// przyciski: jedno dotknięcie, stan zmieniony, karta przerysowana.
//
// Rejestracja (raz, ręcznie — nie ma tu nic, co robiłoby to samo):
//   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//     -H 'content-type: application/json' -d '{
//       "url": "https://forexpassing.com/api/telegram/webhook",
//       "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
//       "allowed_updates": ["callback_query"]
//     }'
//
// Trzy warstwy wstępu, każda odrzuca osobno:
//   1. nagłówek x-telegram-bot-api-secret-token — mechanizm samego Telegrama,
//      jedyny dowód, że POST przyszedł od nich, a nie od kogoś, kto zna adres;
//   2. czat wiadomości musi być czatem działu — cudzy czat nie rusza naszych
//      leadów, nawet gdyby bot został gdzieś dodany;
//   3. TELEGRAM_DESK_USER_IDS — kto konkretnie kliknął, jeśli lista jest
//      ustawiona. Bez niej wpuszczamy każdego, kto jest w czacie działu: czat
//      jest prywatny, więc warstwa 2 już odpowiedziała na pytanie „kto", a
//      martwe przyciski do czasu wypełnienia listy kosztowałyby więcej.
//
// Zawsze odpowiadamy 200. Telegram ponawia webhooki, które padły, więc każdy
// inny kod zamienia jedno kliknięcie w serię powtórzonych zmian statusu.

import { getLead, logEvent, moveStatus, patchLead } from '../_lib/leads-store.js';
import { refreshLeadCard, tg } from '../_lib/telegram.js';

const TAG = '[tg-webhook]';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Czyj to czat. Porównanie po tekście, bo id grupy jest ujemne i długie —
 * Number() gubi na nim precyzję dopiero przy naprawdę dużych wartościach, ale
 * tekst nie gubi nigdy.
 */
function czatDzialu(chatId) {
  const nasze = [process.env.TELEGRAM_LEADS_CHAT_ID, process.env.TELEGRAM_FREE_LEADS_CHAT_ID]
    .filter(Boolean)
    .map(String);
  return nasze.includes(String(chatId));
}

function wpuszczony(from) {
  const lista = String(process.env.TELEGRAM_DESK_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return lista.length === 0 || lista.includes(String(from?.id));
}

/** Nazwa, która ma sens w historii leada. „12345678" nikomu nic nie mówi. */
const ktoKlikn = (from) =>
  from?.username
    ? `@${from.username}`
    : [from?.first_name, from?.last_name].filter(Boolean).join(' ') || `id:${from?.id}`;

// Co robi każdy przycisk. `z` puste znaczy „z dowolnego stanu" — tylko
// przejęcie wymaga konkretnego punktu wyjścia, bo tylko ono jest wyścigiem.
const AKCJE = {
  claim: { z: 'new', na: 'claimed', slowo: 'Twój. Dzwoń.' },
  spam: { na: 'spam', slowo: 'Oznaczone jako spam.' },
  called: { na: 'contacted', slowo: 'Zapisane: oddzwonione.' },
  booked: { na: 'booked', slowo: 'Zapisane: umówiony.' },
  won: { na: 'won', slowo: 'Zapisane: kupił.' },
  lost: { na: 'lost', slowo: 'Zapisane: przegrany.' },
  reopen: { na: 'contacted', slowo: 'Wrócił do obsługi.' },
};

/**
 * Pola, które zmiana statusu zapisuje obok samego statusu.
 *
 * `first_contact_at` ustawiane tylko raz: czas do PIERWSZEGO kontaktu jest
 * miarą, którą ten panel ma poprawiać, więc drugie kliknięcie „oddzwonione" nie
 * może jej wyzerować i pokazać lepszego wyniku, niż był.
 */
function zmianyDla(akcja, lead, kto, teraz) {
  const dane = { status: AKCJE[akcja].na };
  // Kto pracuje, ten jest opiekunem — także wtedy, gdy pominął „Przejmuję" i od
  // razu oddzwonił. Lead bez opiekuna po wykonanej pracy to lead, o którego
  // nikt nie zapyta.
  if (!lead.owner) dane.owner = kto;
  if (akcja === 'claim') dane.claimed_at = teraz;
  if (!lead.first_contact_at && ['called', 'booked', 'won'].includes(akcja)) {
    dane.first_contact_at = teraz;
  }
  return dane;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const sekret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const podany = String(req.headers['x-telegram-bot-api-secret-token'] ?? '');
  if (!sekret || !podany || !timingSafeEqual(podany, sekret)) {
    console.warn(TAG, 'zły secret_token — odrzucone');
    res.status(401).json({ ok: false });
    return;
  }

  const update = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const q = update?.callback_query;
  // Wszystko inne — wiadomości, edycje, dodanie bota do grupy — nie jest naszą
  // sprawą i nie ma powodu, żeby Telegram próbował to dostarczyć drugi raz.
  if (!q?.data) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const [prefiks, id, akcja] = String(q.data).split(':');
  const kto = ktoKlikn(q.from);

  if (prefiks !== 'l' || !id || !AKCJE[akcja]) {
    await odpowiedz(q, 'Nie znam tego przycisku.');
    res.status(200).json({ ok: true, ignored: true });
    return;
  }
  if (!czatDzialu(q.message?.chat?.id) || !wpuszczony(q.from)) {
    console.warn(TAG, 'obcy czat albo obcy użytkownik', {
      chat: q.message?.chat?.id,
      from: q.from?.id,
    });
    await odpowiedz(q, 'Nie masz do tego dostępu.');
    res.status(200).json({ ok: true, denied: true });
    return;
  }

  const lead = await getLead(id);
  if (!lead) {
    await odpowiedz(q, 'Nie ma takiego leada w bazie.');
    res.status(200).json({ ok: true, missing: true });
    return;
  }

  const teraz = new Date().toISOString();
  const { z, na, slowo } = AKCJE[akcja];
  const zmiany = zmianyDla(akcja, lead, kto, teraz);

  // Przejęcie rozstrzyga Postgres, nie kolejność wywołań w Node: warunek
  // `status=eq.new` jedzie do bazy razem z zapisem. Dwóch operatorów klikających
  // w tej samej sekundzie dostaje jednego opiekuna i jedną prawdę, zamiast
  // dwóch kart pokazujących różne imiona.
  let po = null;
  if (z) {
    po = await moveStatus(id, z, zmiany);
    if (!po) {
      // Pusta odpowiedź znaczy „ktoś był szybszy", ale nie mówi kto — a to jest
      // jedyna informacja, po którą klikający sięgnął.
      const aktualny = await getLead(id);
      await odpowiedz(q, `Już przejął ${aktualny?.owner ?? 'ktoś inny'}.`);
      if (aktualny) await przerysuj(aktualny, q);
      res.status(200).json({ ok: true, race: true });
      return;
    }
  } else {
    if (!(await patchLead(id, zmiany))) {
      await odpowiedz(q, 'Baza nie odpowiedziała. Spróbuj z panelu.');
      res.status(200).json({ ok: true, stored: false });
      return;
    }
    po = { ...lead, ...zmiany };
  }

  await logEvent(id, kto, `status:${na}`, { from: lead.status, to: na, via: 'telegram' });
  await odpowiedz(q, slowo);
  await przerysuj(po, q);

  console.log(TAG, id, lead.status, '→', na, 'przez', kto);
  res.status(200).json({ ok: true, status: na });
}

/**
 * Zdjęcie spinnera z przycisku. Telegram czeka na to kilka sekund i pokazuje
 * kręciołek do skutku — brak odpowiedzi wygląda jak zawieszony bot, nawet gdy
 * status zdążył się już zmienić.
 */
async function odpowiedz(q, text) {
  try {
    await tg('answerCallbackQuery', { callback_query_id: q.id, text: text.slice(0, 200) });
  } catch (err) {
    console.error(TAG, 'answerCallbackQuery', err.message);
  }
}

/**
 * Karta ma pokazywać stan, a nie historię kliknięć.
 *
 * Współrzędne bierzemy z samego kliknięcia, nie z notify_chat_id w bazie: to
 * jest ta wiadomość, na którą operator właśnie patrzy, i jedyna, o której na
 * pewno wiemy, że istnieje — karty postowane kiedyś przez Make nie mają w bazie
 * żadnych identyfikatorów.
 */
async function przerysuj(lead, q) {
  await refreshLeadCard({
    ...lead,
    notify_chat_id: q.message?.chat?.id,
    notify_msg_id: q.message?.message_id,
  });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
