// Karta leada na Telegramie — powiadomienie, na którym pracuje dział.
//
// Zmienne środowiskowe:
//   TELEGRAM_BOT_TOKEN           — z @BotFather (współdzielony ze spots-sync)
//   TELEGRAM_LEADS_CHAT_ID       — czat działu, np. -1001234567890
//   TELEGRAM_FREE_LEADS_CHAT_ID  — opcjonalnie: osobny czat dla /freeaccount
//   TELEGRAM_ADMIN_CHAT_ID       — opcjonalnie: dokąd krzyczy watchdog
//   TELEGRAM_PII=short           — opcjonalnie: bez maila i odpowiedzi w czacie
//   PUBLIC_BASE_URL              — do linku „Otwórz w panelu"
//
// Bez TELEGRAM_LEADS_CHAT_ID cały moduł jest no-opem i zwraca `skipped`. To
// jest przełącznik wdrożenia: dopóki karty postuje scenariusz Make, ta zmienna
// zostaje nieustawiona i nikt nie dostaje wiadomości dwa razy — dublowanie było
// powodem, dla którego wysyłkę stąd w ogóle usunięto (commit 0f20519).
//
// Nazwa „leads" w zmiennej jest celowa. Karta niesie imię, e-mail i numer
// telefonu, więc wolno jej trafić wyłącznie do prywatnego czatu działu —
// a zmienną nazwaną TELEGRAM_CHAT_ID ktoś kiedyś wskaże na kanał publiczny.

import { gradeLead } from './lead-quality.js';
import { shortCode } from './leads-store.js';

const MAX = 3900; // Telegram tnie wiadomość na 4096 znakach.

// Tyle, ile ta wysyłka kiedykolwiek potrzebowała. Dłużej nie czekamy, bo po
// drugiej stronie limitu stoi człowiek patrzący na spinner formularza — a lead
// jest już w bazie, więc niedosłana karta to zadanie dla watchdoga, nie awaria.
const TIMEOUT_MS = 6000;

const isFreeLead = (lead) => String(lead.source ?? '').startsWith('free');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const chatFor = (lead) =>
  isFreeLead(lead)
    ? process.env.TELEGRAM_FREE_LEADS_CHAT_ID || process.env.TELEGRAM_LEADS_CHAT_ID
    : process.env.TELEGRAM_LEADS_CHAT_ID;

/**
 * Jedno wywołanie Bot API. Zwraca `result` albo rzuca z czytelnym powodem.
 *
 * Telegram przyjmuje ~20 wiadomości na minutę do jednej grupy. Kampania, która
 * przyniesie trzydzieści zgłoszeń w kwadrans, ten limit przekroczy — i wtedy
 * odpowiedzią jest 429 z `retry_after`. Jedno ponowienie po podanym czasie
 * mieści się w budżecie funkcji; przy drugiej porażce oddajemy sprawę
 * watchdogowi, zamiast trzymać żądanie w nieskończoność.
 */
export async function tg(method, params, { retried = false } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (body.ok) return body.result;

  const czekaj = Number(body.parameters?.retry_after);
  if (res.status === 429 && Number.isFinite(czekaj) && czekaj <= 5 && !retried) {
    await new Promise((r) => setTimeout(r, czekaj * 1000));
    return tg(method, params, { retried: true });
  }
  const err = new Error(`${method}: ${body.description ?? res.status}`);
  err.status = res.status;
  err.retryAfter = Number.isFinite(czekaj) ? czekaj : null;
  throw err;
}

/**
 * Numer w jednym kawałku, bez spacji.
 *
 * Telegram nie honoruje linków `tel:`, ale ciąg wyglądający jak numer
 * międzynarodowy zamienia w klikalny sam z siebie — a operator z telefonem w
 * ręku ma wtedy jedno dotknięcie zamiast przepisywania cyfr do dialera.
 * Numer bez kierunkowego nie jest dialowalny i wiersz mówi to wprost.
 */
function phoneLine(lead) {
  const raw = String(lead.phone ?? '').trim();
  if (!raw) return '';
  const cyfry = raw.replace(/\D/g, '');
  return raw.startsWith('+') ? `+${cyfry}` : `${raw} (no country code)`;
}

/**
 * Lead jako czytelna karta.
 *
 * Pierwsza linia to ocena, bo to ją Telegram pokazuje na liście czatów: hot
 * lead ma być rozpoznawalny bez otwierania wiadomości. Druga niesie kod leada —
 * cztery znaki, którymi da się o nim powiedzieć przez telefon i które wpisuje
 * się w wyszukiwarkę panelu.
 */
export function formatLead(lead, { pii = process.env.TELEGRAM_PII } = {}) {
  const skrotowo = pii === 'short';
  const rejected = lead.outcome === 'not_qualified';
  const q = rejected ? null : (lead.quality ?? gradeLead(lead));

  const fromFree = isFreeLead(lead);
  const freeBadge = fromFree ? ' · 🆓 FREE CHALLENGE' : '';
  const sourceLabel = fromFree ? 'FREE CHALLENGE (/freeaccount)' : lead.source;

  const kod = lead.id ? ` · #${shortCode(lead.id)}` : '';
  // Pusty `tier` stawia api/lead/inbound.js dla leadów spoza kwestionariusza
  // (Meta, CRM): grader nie ma tam czego rozpoznać, a wypisanie „Cold lead 0/9"
  // byłoby oceną, której nikt nie wystawił. Warunkiem jest brak oceny, a nie
  // samo `graded: false`, bo dokładnie ten sam brak widzi panel — czytają
  // kolumnę `tier`, więc karta i lista nie mogą powiedzieć czegoś innego.
  const lines = rejected
    ? [`🔴 <b>Not qualified</b>${freeBadge}`, `⚪️ —${kod}`]
    : q.tier == null
      ? [`❔ <b>Unscored lead</b>${freeBadge}`, `🟢 Qualified${kod}`]
      : [`${q.emoji} <b>${q.label}</b> · ${q.score}/${q.max}${freeBadge}`, `🟢 Qualified${kod}`];

  const rows = [
    ['Name', esc(lead.name)],
    // Bez esc(): to nasz własny, przefiltrowany do cyfr ciąg, a każdy dodatkowy
    // znak zabrałby mu klikalność.
    ['Phone', phoneLine(lead)],
    ['Telegram', lead.telegram ? `@${esc(lead.telegram)}` : ''],
    ...(skrotowo ? [] : [['Email', esc(lead.email)]]),
    ['Referred by', esc(lead.ref)],
    ['Source', esc(sourceLabel)],
  ].filter(([, v]) => v);

  lines.push('', ...rows.map(([k, v]) => `<b>${k}:</b> ${v}`));

  // Ile ten człowiek czeka. Na pierwszej wysyłce to zero i nic nie wnosi —
  // pokazuje się dopiero przy ponowieniu i przy przypomnieniach watchdoga,
  // czyli dokładnie tam, gdzie jest powodem, żeby przerwać to, co się robi.
  const czeka = Math.floor((Date.now() - new Date(lead.created_at ?? lead.ts ?? Date.now())) / 60000);
  if (czeka >= 1) lines.push(`<b>Waiting:</b> ${czeka} min`);

  if (lead.owner) lines.push(`<b>Opiekun:</b> ${esc(lead.owner)}`);

  if (q?.reasons.length) lines.push('', `<b>Why:</b> ${esc(q.reasons.join(' · '))}`);
  if (q?.gaps.length) lines.push(`<b>Gaps:</b> ${esc(q.gaps.join(' · '))}`);
  // Co formularz przyjął, ale czego nikt nie powinien brać na wiarę. Osobna
  // linia, bo od niej zależy, czy w te dane w ogóle warto inwestować telefon.
  if (q?.penalties.length) lines.push(`⚠️ <b>Check:</b> ${esc(q.penalties.join(' · '))}`);

  const answers = skrotowo ? [] : Object.entries(lead.answers ?? {});
  if (answers.length) {
    lines.push('', '<b>Answers</b>');
    for (const [pyt, odp] of answers) lines.push(`• ${esc(pyt)}\n   → <b>${esc(odp)}</b>`);
  }
  if (skrotowo) lines.push('', '<i>E-mail i odpowiedzi w panelu.</i>');

  // Kliknięcie w tag przeszukuje czat — najtańszy sposób na „pokaż mi wszystkie
  // gorące leady" bez otwierania czegokolwiek innego.
  lines.push(
    '',
    [rejected ? '#lead_out' : q.tag, fromFree ? '#free_challenge' : ''].filter(Boolean).join(' ')
  );

  const text = lines.join('\n');
  return text.length > MAX ? `${text.slice(0, MAX)}\n…` : text;
}

export const deskUrl = (id) => {
  const base = (process.env.PUBLIC_BASE_URL || 'https://forexpassing.com').replace(/\/+$/, '');
  return `${base}/desk?id=${id}`;
};

/**
 * Przyciski pod kartą — jedyna rzecz, którą operator musi zrobić, żeby lead
 * przestał być niczyj. Zestaw zależy od stanu, żeby nie proponować kroku,
 * który już padł: po przejęciu nie ma czego przejmować.
 */
export function keyboardFor(lead) {
  const id = lead.id;
  if (!id) return undefined;
  const b = (text, akcja) => ({ text, callback_data: `l:${id}:${akcja}` });
  const panel = [{ text: '🔎 Otwórz w panelu', url: deskUrl(id) }];

  if (lead.status === 'won' || lead.status === 'lost' || lead.status === 'spam') {
    return { inline_keyboard: [[b('↩️ Wznów', 'reopen')], panel] };
  }
  if (lead.status === 'new' || !lead.status) {
    return { inline_keyboard: [[b('🙋 Przejmuję', 'claim'), b('🚫 Spam', 'spam')], panel] };
  }
  return {
    inline_keyboard: [
      [b('📞 Oddzwonione', 'called'), b('🗓 Umówiony', 'booked')],
      [b('✅ Kupił', 'won'), b('❌ Przegrany', 'lost')],
      panel,
    ],
  };
}

/**
 * Wysyłka karty. Nigdy nie rzuca — zwraca opis wyniku, który leads-store
 * zapisuje przy leadzie. Porażka zostawia `notified_at` pusty, a to jest cała
 * kolejka ponowień: watchdog czyta dokładnie ten warunek.
 */
export async function sendLeadToTelegram(lead) {
  const chatId = chatFor(lead);
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    return { ok: false, skipped: true, error: 'TELEGRAM_LEADS_CHAT_ID not set' };
  }
  try {
    const msg = await tg('sendMessage', {
      chat_id: chatId,
      text: formatLead(lead),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboardFor(lead),
    });
    return { ok: true, chatId, messageId: msg.message_id };
  } catch (err) {
    console.error('[telegram] send failed', err.message);
    return { ok: false, error: err.message, retryAfter: err.retryAfter ?? null };
  }
}

/** Przerysowanie istniejącej karty po zmianie stanu. Best effort. */
export async function refreshLeadCard(lead) {
  if (!lead.notify_chat_id || !lead.notify_msg_id) return false;
  try {
    await tg('editMessageText', {
      chat_id: lead.notify_chat_id,
      message_id: Number(lead.notify_msg_id),
      text: formatLead(lead),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboardFor(lead),
    });
    return true;
  } catch (err) {
    // „message is not modified" to nie awaria, tylko dwa kliknięcia w to samo.
    if (!/not modified/i.test(err.message)) console.error('[telegram] edit failed', err.message);
    return false;
  }
}

/**
 * Krzyk do administratora. Osobny czat, bo to nie jest lead i nie ma prawa
 * ginąć w strumieniu kart — a alarm ciszy jest jedyną rzeczą, która mówi, że
 * kart nie ma wcale.
 */
export async function notifyAdmin(text) {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_LEADS_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.error('[telegram] admin alert not delivered —', text);
    return false;
  }
  try {
    await tg('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    return true;
  } catch (err) {
    console.error('[telegram] admin alert failed', err.message);
    return false;
  }
}
