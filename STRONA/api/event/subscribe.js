// POST /api/event/subscribe — application form on the safe page.
//
// On Cloudflare this endpoint lives in workers/routes/event.ts and writes the
// lead to KV. Vercel has no Worker and no KV, so this function mirrors the same
// contract (honeypot + validation + {ok:true}) and forwards the lead to the
// LEAD_WEBHOOK env var.
//
// From here the lead goes four ways, each configured on its own and each
// independent of the others: the function log (always), LEAD_WEBHOOK, the
// Telegram channel, and the team's Google Sheet. Every one of them past the log
// is a no-op until its env vars are set — see _lib/telegram.js and
// _lib/sheets.js — so on a deployment with none of them configured an
// application is visible in Vercel's runtime logs and nowhere else.

import { infoEmail, qualifiedEmail, sendEmail } from '../_lib/emails.js';
import { gradeLead } from '../_lib/lead-quality.js';
import { appendLeadToSheet } from '../_lib/sheets.js';
import { sendLeadToTelegram } from '../_lib/telegram.js';
import { normalizeTelegram } from '../../src/lib/phone-rules.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

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
  // Logged, because this is the one branch where an application disappears while
  // the sender is told it arrived: no alert, no sheet row, no error anywhere. If
  // the value in there is ever a real company name next to a real address, the
  // trap caught a person, and that should cost one glance at the log to see.
  if (str(body.referral_note)) {
    console.warn('[lead] honeypot filled — dropped', {
      value: str(body.referral_note).slice(0, 80),
      email: str(body.email).slice(0, 200),
    });
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
    // Every question/answer pair, so the team reads the whole picture.
    answers:
      body.answers && typeof body.answers === 'object'
        ? Object.fromEntries(
            Object.entries(body.answers)
              .slice(0, 30)
              .map(([q, a]) => [String(q).slice(0, 160), str(a).slice(0, 120)])
          )
        : {},
    experience: str(body.experience).slice(0, 40),
    goal: str(body.goal).slice(0, 2000),
    source,
    // 'qualified' | 'not_qualified'. The questionnaire sends both. The
    // safe-page form has no qualification step, so its leads land as
    // not_qualified BY DEFINITION (owner's rule, 2026-08): nobody answered the
    // two opening questions, and the desk reads that tab as "warm these up".
    outcome: body.outcome === 'not_qualified' || source === 'safe' ? 'not_qualified' : 'qualified',
    // Strona stoi za Cloudflarem, więc x-forwarded-for w wersji, którą widzi
    // Vercel, to węzeł brzegowy Cloudflare — kolumna `ip` w arkuszu czytała
    // 162.158.x.x dla każdego zgłoszenia. Prawdziwy adres jest w
    // cf-connecting-ip; to samo pole czyta workerowa wersja tego endpointu w
    // workers/routes/event.ts. Jeśli kiedyś Cloudflare zniknie z drogi,
    // zostaje pierwszy skok z x-forwarded-for, czyli klient. Odczyt siedzi na
    // początku handlera, bo ten sam adres karmi limit per-IP.
    ip,
    ua: (req.headers['user-agent'] || '').slice(0, 200),
  };

  if (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
    res.status(400).json({ error: 'invalid' });
    return;
  }

  // Graded once, here, so the channel post, the webhook and the function log
  // all carry the same verdict instead of each consumer working it out again.
  // A rejected applicant is not scored: the grade only ranks people we want.
  lead.quality = lead.outcome === 'qualified' ? gradeLead(lead) : null;

  // Always log — this is the only record when no webhook is configured.
  console.log('[lead]', JSON.stringify(lead));

  // The one verdict the browser is allowed to act on. `high` is unreachable
  // without "buying now" and without a single piece of junk in the form (see
  // _lib/lead-quality.js), so this is a narrow gate on purpose: these are the
  // applicants worth a page of their own. A rejected applicant is never scored,
  // so this is false for them too.
  const hq = lead.quality?.tier === 'high';

  // Channel post, sheet row, confirmation email and the webhook go out together
  // rather than one after the other: they are independent, and running them in
  // sequence made the applicant wait for all four. All are best-effort — the
  // lead is already in the log above, so none of them may turn a captured
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
    ? qualifiedEmail({ name: lead.name })
    : lead.source === 'safe'
      ? infoEmail({ name: lead.name })
      : null;

  const [posted, sent, filed, forwarded] = await Promise.all([
    sendLeadToTelegram(lead),
    // 'skipped' rather than false, so the log below distinguishes "we chose not
    // to write" from "the send failed" — otherwise a broken Resend key looks
    // exactly like a warm lead.
    mail
      ? sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text })
      : Promise.resolve('skipped'),
    appendLeadToSheet(lead),
    forwardLead(lead),
  ]);
  console.log(
    '[lead]',
    lead.outcome,
    lead.quality?.tier ?? 'unscored',
    'telegram:',
    posted,
    'email:',
    sent,
    'sheet:',
    filed,
    'webhook:',
    forwarded
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
