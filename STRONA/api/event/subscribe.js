// POST /api/event/subscribe — application form on the safe page.
//
// On Cloudflare this endpoint lives in workers/routes/event.ts and writes the
// lead to KV. Vercel has no Worker and no KV, so this function mirrors the same
// contract (honeypot + validation + {ok:true}) and forwards the lead to the
// LEAD_WEBHOOK env var.
//
// Kolejność w tym pliku jest nienegocjowalna: najpierw trwały zapis w Supabase
// (_lib/leads-store.js), dopiero potem powiadomienia. Karta na Telegramie,
// wiersz w arkuszu, LEAD_WEBHOOK i mail są kopiami — każdą z nich da się
// ponowić WYŁĄCZNIE dlatego, że wiersz w bazie już jest.
//
// Do 2026-08 jedynym trwałym śladem był `console.log` niżej i wiersz w arkuszu,
// który przy awarii cichł. Odpowiedź 2xx od odbiorcy LEAD_WEBHOOK wyglądała
// wtedy jak dowód doręczenia, a jest tylko dowodem, że ktoś odebrał POST-a:
// karty przestały wpadać na czat działu i nie zauważył tego nikt przez tydzień.
//
// Wysyłka na Telegram jest tu z powrotem, ale za przełącznikiem: bez
// TELEGRAM_LEADS_CHAT_ID nie leci stąd nic. Dopóki karty postuje scenariusz
// Make, zmienna zostaje nieustawiona — dublowanie kart było powodem, dla
// którego wysyłkę stąd w ogóle usunięto (commit 0f20519).

import { infoEmail, qualifiedEmail, sendEmail } from '../_lib/emails.js';
import { gradeLead } from '../_lib/lead-quality.js';
import {
  findRecent,
  logEvent,
  markNotified,
  patchLead,
  saveLead,
  shortCode,
} from '../_lib/leads-store.js';
import { appendLeadToSheet } from '../_lib/sheets.js';
import { sendLeadToTelegram } from '../_lib/telegram.js';
import { normalizeTelegram } from '../../src/lib/phone-rules.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Skąd przyszedł człowiek, a nie tylko kliknięcie. Bez tego raport odpowiada
// „ilu ich było", a nie „która kampania je przyniosła" — czyli nie odpowiada na
// jedyne pytanie, od którego zależy podział budżetu. Sztywna lista kluczy, bo
// to leci do bazy: `attribution` ma być kolumną, nie workiem na cudze pola.
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'ttclid',
  'gclid',
];

function attributionOf(body) {
  const src = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
  return Object.fromEntries(
    ATTRIBUTION_KEYS.map((k) => [k, str(src[k]).slice(0, 200)]).filter(([, v]) => v)
  );
}

// Every question/answer pair, so the team reads the whole picture. Czytane też
// dla zgłoszeń odrzuconych: człowiek z literówką w mailu odpowiedział na całą
// ankietę i nie ma powodu, żeby te odpowiedzi przepadły razem z literówką.
const answersOf = (body) =>
  body.answers && typeof body.answers === 'object'
    ? Object.fromEntries(
        Object.entries(body.answers)
          .slice(0, 30)
          .map(([q, a]) => [String(q).slice(0, 160), str(a).slice(0, 120)])
      )
    : {};

// Endpoint jest publiczny i rozsyła maile przez Resend — bez żadnej zapory
// każdy POST-em może spamować cudzą skrzynkę na nasz koszt i naszą reputację
// domeny. Trzy smycze poniżej (Origin, limit per-IP, pułapka czasowa) nie
// zatrzymają zdeterminowanego botnetu, ale odcinają cały prosty spam bez
// dokładania infrastruktury i bez tarcia dla człowieka z formularzem.

// Przeglądarka wysyłająca formularz z naszej strony zawsze niesie któryś z tych
// hostów. Brak nagłówka Origin przepuszczamy: starsze przeglądarki i nie-CORS-owe
// POST-y go nie mają, a odcinanie ich karałoby ludzi, nie boty.
function originAllowed(origin) {
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  return (
    host === 'forexpassing.com' ||
    host === 'www.forexpassing.com' ||
    host.endsWith('.vercel.app') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

// Limit per-IP w pamięci modułu. To smycz, nie kłódka: każda instancja funkcji
// liczy osobno i zapomina wszystko przy zimnym starcie. Wystarcza, bo człowiek
// nie składa pięciu zgłoszeń w minutę, a skrypt lecący z jednego adresu tak.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateHits = new Map();
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const recent = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateHits.set(ip, recent);
  // Mapa nie może rosnąć bez końca w ciepłej instancji.
  if (rateHits.size > 1000) {
    for (const [k, v] of rateHits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(k);
    }
  }
  return false;
}

// Krótko, bo to nie jest czas oczekiwania odbiorcy — to czas, o który stoi
// człowiek patrzący na formularz. Odbiorca bywa funkcją serverless, więc zimny
// start po drugiej stronie mieści się w tym oknie, a zawieszenie już nie.
const WEBHOOK_TIMEOUT_MS = 6000;

// Przekazanie leada dalej (LEAD_WEBHOOK). Zwraca etykietę do logu, nigdy nie
// rzuca — lead jest już w logu funkcji, zanim to poleci.
//
// Wywoływane RÓWNOLEGLE z resztą i na smyczy. Wcześniej stało przed wysyłką na
// Telegram i było czekane bez limitu: wolny odbiorca zabierał ze sobą alert na
// kanale, wiersz w arkuszu i przekierowanie na thank-you, bo cała funkcja
// dobijała do limitu czasu i kończyła się błędem. Cudzy zimny start nie jest
// powodem, żeby człowiek, który właśnie wypełnił formularz, zobaczył błąd.
async function forwardLead(lead) {
  if (!process.env.LEAD_WEBHOOK) return 'skipped';
  // Token w nagłówku, nie w adresie: adresy lądują w logach dostępowych po obu
  // stronach, a sam adres webhooka nie jest dowodem, że POST przyszedł od nas.
  const headers = { 'content-type': 'application/json' };
  if (process.env.LEAD_WEBHOOK_TOKEN) {
    headers['x-lead-token'] = process.env.LEAD_WEBHOOK_TOKEN;
  }
  try {
    const res = await fetch(process.env.LEAD_WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    // Kod odpowiedzi trafia do logu: cichy 401 z odbiorcy wyglądał dotąd
    // dokładnie tak samo jak udana wysyłka.
    return res.ok ? 'ok' : `http ${res.status}`;
  } catch (err) {
    console.error('[lead] webhook failed', err);
    return 'failed';
  }
}

/**
 * Zgłoszenie zatrzymane przez pułapkę albo walidację — wiersz ze statusem
 * `dropped`, nie cisza.
 *
 * Nadawca dostaje dokładnie to, co dotąd (skrypt niczego się nie uczy), ale
 * „pułapka złapała człowieka" przestaje być czymś, co widać wyłącznie w logu
 * funkcji o krótkiej retencji. Nic stąd nie leci na Telegram — dropped leży
 * w panelu, w zakładce odrzuconych, i czeka aż ktoś na nie spojrzy.
 */
async function zapiszOdrzucone(body, powod, ip, ua) {
  const submissionId = str(body.submission_id).slice(0, 64);
  const zapis = await saveLead({
    ts: Date.now(),
    // Osobna przestrzeń kluczy idempotencji. Bez prefiksu poprawiona literówka
    // w mailu wracałaby z tym samym submission_id, trafiała w unique na wierszu
    // `dropped` i ginęła jako „duplikat" — czyli walidacja kasowałaby leada
    // dokładnie tak, jak przed tą zmianą, tyle że zostawiając ślad.
    submission_id: submissionId ? `drop:${submissionId}` : '',
    name: str(body.name).slice(0, 120),
    email: str(body.email).slice(0, 200),
    phone: str(body.phone).slice(0, 40),
    phoneIso: str(body.phoneIso).slice(0, 2).toUpperCase(),
    telegram: normalizeTelegram(str(body.telegram).slice(0, 60)).slice(0, 60),
    country: str(body.country).slice(0, 80),
    ref: str(body.ref).slice(0, 40),
    source: str(body.source).slice(0, 40) || 'safe',
    outcome: 'not_qualified',
    answers: answersOf(body),
    attribution: attributionOf(body),
    ip,
    ua,
    status: 'dropped',
    note: powod,
  });
  if (!zapis) console.error('[lead] dropped + STORE FAILED', powod, str(body.email).slice(0, 200));
  return zapis;
}

/**
 * Karta na czacie działu. Zwraca etykietę do logu, nigdy nie rzuca.
 *
 * Bez wiersza w bazie nie wysyłamy nic: karta bez `id` nie ma przycisków, więc
 * byłaby powiadomieniem, na którym nie da się pracować — a lead, którego nie ma
 * gdzie odszukać, jest gorszy niż lead, o którym się nie wie.
 *
 * Nieudana wysyłka ZOSTAWIA `notified_at` pusty i na tym polega cała kolejka
 * ponowień: watchdog czyta dokładnie ten warunek.
 */
async function powiadom(lead, zapis) {
  if (!zapis) return 'not stored';
  // Ta sama przeglądarka ponowiła wysyłkę. Wiersz jest jeden i karta też.
  if (zapis.duplicate) return 'duplicate';

  // Ten sam człowiek, nowe wypełnienie formularza (inny submission_id: nowa
  // karta, druga próba). Wiersz zostaje — nic nie kasujemy — ale dział dostaje
  // jedną kartę zamiast dwóch, bo druga karta to drugi telefon do kogoś, kto
  // właśnie rozmawia z pierwszym operatorem.
  const pierwszy = await findRecent(lead);
  if (pierwszy) {
    await patchLead(lead.id, { duplicate_of: pierwszy });
    await logEvent(pierwszy, 'system', 'duplicate', {
      lead_id: lead.id,
      source: lead.source,
    });
    return `dup of ${shortCode(pierwszy)}`;
  }

  const wynik = await sendLeadToTelegram(lead);
  // Wyłączony nadawca to nie porażka i nie ma czego ponawiać — patrz nagłówek
  // _lib/telegram.js. Watchdog rozpoznaje ten sam stan po tej samej zmiennej.
  if (wynik.skipped) return 'skipped';
  await markNotified(lead.id, wynik);
  return wynik.ok ? 'ok' : 'retry';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method' });
    return;
  }

  const origin = str(req.headers.origin);
  if (origin && !originAllowed(origin)) {
    console.warn('[lead] foreign origin — rejected', { origin: origin.slice(0, 120) });
    res.status(403).json({ error: 'origin' });
    return;
  }

  // Ten sam odczyt IP co niżej w leadzie — patrz komentarz przy polu `ip`.
  const ip = str(req.headers['cf-connecting-ip']) || str(req.headers['x-forwarded-for']).split(',')[0].trim();
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  if (rateLimited(ip)) {
    console.warn('[lead] rate limited', { ip });
    res.status(429).json({ error: 'rate' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  if (!body) {
    res.status(400).json({ error: 'invalid JSON' });
    return;
  }

  // Honeypot — real users never see this field. Bots fill it. Answer as if it
  // worked so the bot has nothing to learn, and drop it.
  //
  // Zapisywane, bo to jest gałąź, w której zgłoszenie znika, a nadawca słyszy
  // „ok": bez alertu, bez wiersza w arkuszu, bez błędu gdziekolwiek. Jeśli w
  // polu kiedykolwiek stanie prawdziwa nazwa firmy obok prawdziwego adresu,
  // pułapka złapała człowieka — i to musi dać się zobaczyć po tygodniu, a nie
  // tylko w oknie retencji logu.
  if (str(body.referral_note)) {
    console.warn('[lead] honeypot filled — dropped', {
      value: str(body.referral_note).slice(0, 80),
      email: str(body.email).slice(0, 200),
    });
    await zapiszOdrzucone(body, `honeypot: ${str(body.referral_note).slice(0, 80)}`, ip, ua);
    res.status(200).json({ ok: true });
    return;
  }

  // The trap used to be called `company` — a name Chromium classifies as the
  // organisation of a saved address and fills on sight, offscreen and
  // autocomplete="off" notwithstanding. Anyone whose browser had a profile saved
  // was answered "ok" and dropped. Cached copies of the static pages still post
  // the field, so it is recorded and then ignored: filled `company` is evidence
  // of autofill, not of a bot.
  if (str(body.company)) {
    console.warn('[lead] legacy honeypot field filled — ignored', {
      value: str(body.company).slice(0, 80),
      email: str(body.email).slice(0, 200),
    });
  }

  // Pułapka czasowa: formularz wysyła, ile milisekund minęło od otwarcia.
  // Człowiek potrzebuje ich tysięcy, skrypt setek. Brak pola przepuszcza —
  // cache'owane kopie stron statycznych go nie wysyłają (ten sam powód, dla
  // którego `company` wyżej jest tylko odnotowywane). Odpowiadamy "ok" jak
  // honeypot, żeby skrypt nie miał czego się nauczyć.
  const elapsedMs = Number(body.elapsed_ms);
  if (Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < 3000) {
    console.warn('[lead] time trap — dropped', {
      elapsed_ms: elapsedMs,
      email: str(body.email).slice(0, 200),
    });
    await zapiszOdrzucone(body, `time trap: ${elapsedMs} ms`, ip, ua);
    res.status(200).json({ ok: true });
    return;
  }

  // Kanał trafienia liczony przed leadem, bo od niego zależy i outcome, i mail:
  // formularze statyczne (about-us/welcome) nie wysyłają `source` wcale.
  const source = str(body.source).slice(0, 40) || 'safe';
  // Handle znormalizowany na wejściu (bez @, wyciągnięty z linku t.me,
  // bez interpunkcji na końcu) — panel dostaje coś klikalnego, a oryginał
  // zostaje obok, żeby literówka była widoczna, nie zgadywana.
  const telegramRaw = str(body.telegram).slice(0, 60);
  const telegram = normalizeTelegram(telegramRaw).slice(0, 60);

  // Field set matches workers/routes/event.ts. The safe-page form only sends
  // name/email/experience/goal, so the questionnaire-only fields default to ''.
  const lead = {
    ts: Date.now(),
    // Klucz idempotencji z przeglądarki: jeden na WYPEŁNIENIE formularza, nie na
    // kliknięcie „wyślij". Ponowna próba po zerwanej sieci niesie ten sam, więc
    // jest tym samym leadem, a nie drugim (unique w public.leads rozstrzyga to
    // po stronie bazy). Puste pole przepuszczamy: cache'owane kopie stron
    // statycznych go nie wysyłają, a to nie jest powód, żeby stracić zgłoszenie.
    submission_id: str(body.submission_id).slice(0, 64),
    name: str(body.name).slice(0, 120),
    email: str(body.email).slice(0, 200),
    phone: str(body.phone).slice(0, 40),
    // The country behind the dialling code, so the grader can tell a plausible
    // number from a made-up one. Two letters or nothing.
    phoneIso: str(body.phoneIso).slice(0, 2).toUpperCase(),
    country: str(body.country).slice(0, 80),
    propFirm: str(body.propFirm).slice(0, 80),
    accountSize: str(body.accountSize).slice(0, 40),
    stage: str(body.stage).slice(0, 40),
    // Partner slug parked by /r/<slug>. Empty for direct traffic.
    ref: str(body.ref).slice(0, 40),
    telegram,
    ...(telegram !== telegramRaw ? { telegram_raw: telegramRaw } : {}),
    answers: answersOf(body),
    experience: str(body.experience).slice(0, 40),
    goal: str(body.goal).slice(0, 2000),
    source,
    // 'qualified' | 'not_qualified'. The questionnaire sends both. The
    // safe-page form has no qualification step, so its leads land as
    // not_qualified BY DEFINITION (owner's rule, 2026-08): nobody answered the
    // two opening questions, and the desk reads that tab as "warm these up".
    outcome: body.outcome === 'not_qualified' || source === 'safe' ? 'not_qualified' : 'qualified',
    attribution: attributionOf(body),
    // Strona stoi za Cloudflarem, więc x-forwarded-for w wersji, którą widzi
    // Vercel, to węzeł brzegowy Cloudflare — kolumna `ip` w arkuszu czytała
    // 162.158.x.x dla każdego zgłoszenia. Prawdziwy adres jest w
    // cf-connecting-ip; to samo pole czyta workerowa wersja tego endpointu w
    // workers/routes/event.ts. Jeśli kiedyś Cloudflare zniknie z drogi,
    // zostaje pierwszy skok z x-forwarded-for, czyli klient. Odczyt siedzi na
    // początku handlera, bo ten sam adres karmi limit per-IP.
    ip,
    ua,
  };

  if (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
    // Ta gałąź nie zostawiała dotąd nawet logu. Wiersz jest, bo „wysyłałem i
    // wyskoczył błąd" zgłoszone przez klienta trzeba mieć czym sprawdzić —
    // a najczęstszą przyczyną jest literówka w mailu, nie skrypt.
    await zapiszOdrzucone(body, 'invalid: name/email', ip, ua);
    res.status(400).json({ error: 'invalid' });
    return;
  }

  // Graded once, here, so the channel post, the webhook and the function log
  // all carry the same verdict instead of each consumer working it out again.
  // A rejected applicant is not scored: the grade only ranks people we want.
  lead.quality = lead.outcome === 'qualified' ? gradeLead(lead) : null;

  // Log zostaje, choć nie jest już jedynym zapisem: kiedy padnie Supabase, to
  // jest to, co da się z tego zgłoszenia odzyskać ręcznie.
  console.log('[lead]', JSON.stringify(lead));

  // Trwały zapis PRZED czymkolwiek innym. Dopiero tutaj lead dostaje tożsamość:
  // wszystko poniżej może paść i da się to ponowić z bazy. Czekamy na to
  // świadomie — jedno zapytanie z limitem 3 s jest tańsze niż zgłoszenie,
  // którego nie ma gdzie szukać.
  const zapis = await saveLead(lead);
  if (zapis) lead.id = zapis.id;
  else console.error('[lead] STORE FAILED — ten log jest jedynym zapisem', lead.email);

  // The one verdict the browser is allowed to act on. `high` is unreachable
  // without "buying now" and without a single piece of junk in the form (see
  // _lib/lead-quality.js), so this is a narrow gate on purpose: these are the
  // applicants worth a page of their own. A rejected applicant is never scored,
  // so this is false for them too.
  //
  // The free funnel (/freeaccount) is the exception, and it has to be: it does
  // not ask when you intend to buy, because on that offer we are the ones
  // paying. That question carries 4 of the 9 points, which puts the threshold of
  // 7 out of reach there — grading by score would send every free applicant to
  // the plain confirmation card instead of /thank-you. Owner's call: everyone
  // who clears the free questionnaire is treated as HQ. The score is still
  // computed and still posted to the channel, because the desk reads it to
  // decide who to message first.
  const fromFree = String(lead.source ?? '').startsWith('free');
  const hq = lead.outcome === 'qualified' && (fromFree || lead.quality?.tier === 'high');

  // Channel post, sheet row, confirmation email and the webhook go out together
  // rather than one after the other: they are independent, and running them in
  // sequence made the applicant wait for all four. All are best-effort — the
  // lead is already in the database above, so none of them may turn a captured
  // application into a 500 for the person who just filled the form in.
  //
  // Both outcomes are filed. The sheet has an `outcome` column precisely so a
  // rejection is a row that can be counted, rather than something that happened
  // and left no trace.
  //
  // Two audiences get mail, nobody else. HQ applicants get the acceptance;
  // information-request leads (no `source`, so no questionnaire) get the light
  // infoEmail, because the desk wants them warmed even though nobody graded
  // them. Warm and cold questionnaire leads still get only the confirmation
  // card and its Telegram button — writing to all of them was the previous
  // behaviour and stays deliberately off (`notQualifiedEmail` in _lib/emails.js
  // is the one-line way back).
  const mail = hq
    ? qualifiedEmail({ name: lead.name, free: fromFree })
    : lead.source === 'safe'
      ? infoEmail({ name: lead.name })
      : null;

  const [sent, filed, forwarded, karta] = await Promise.all([
    // 'skipped' rather than false, so the log below distinguishes "we chose not
    // to write" from "the send failed" — otherwise a broken Resend key looks
    // exactly like a warm lead.
    mail
      ? sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text })
      : Promise.resolve('skipped'),
    appendLeadToSheet(lead),
    forwardLead(lead),
    powiadom(lead, zapis),
  ]);

  // Dowody doręczenia obu kopii jednym zapytaniem. `sheet: false` przestaje być
  // słowem w logu i staje się pustą kolumną, którą widać obok wiersza — po tym
  // poznaje się, że arkusz milczy od wtorku, a nie że nikt się nie zgłaszał.
  const znaczniki = {};
  const teraz = new Date().toISOString();
  if (filed) znaczniki.sheet_at = teraz;
  if (forwarded === 'ok') znaczniki.webhook_at = teraz;
  if (lead.id && Object.keys(znaczniki).length) await patchLead(lead.id, znaczniki);

  console.log(
    '[lead]',
    lead.outcome,
    lead.quality?.tier ?? 'unscored',
    'store:',
    zapis ? shortCode(zapis.id) : 'FAILED',
    'email:',
    sent,
    'sheet:',
    filed,
    'webhook:',
    forwarded,
    'telegram:',
    karta
  );

  // `hq` and nothing else. The browser needs to know whether to send this person
  // to /thank-you, not what the grader thought of them — no tier name, and no
  // URL either: the destination is hardcoded client-side, so there is nothing
  // here for anyone to point somewhere else.
  res.status(200).json({ ok: true, hq });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
