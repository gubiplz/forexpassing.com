// POST /api/lead/inbound — leady spoza formularza (Meta Lead Ads, Make, CRM).
//
// Formularz na landingu nie jest jedyną drogą, którą lead może przyjść, ale
// dotąd był jedyną, którą umieliśmy przyjąć. Wszystko z Meta Lead Ads
// lądowałoby w skrzynce albo w scenariuszu Make i nie miałoby ani wiersza w
// bazie, ani karty na czacie, ani statusu — czyli byłoby leadem, którego panel
// nie widzi. Ten endpoint to zamyka: jedno wejście, ten sam `saveLead()` i ta
// sama karta co dla formularza.
//
// `submission_id` = `leadgen_id` Meta. Meta ponawia dostawę, dopóki nie dostanie
// 200, więc bez tego jeden lead z niepewnej sieci założyłby kilka wierszy i
// wywołał kilka telefonów do tej samej osoby.
//
// Odpowiadamy 200 także wtedy, gdy lead był już znany. Kod inny niż 2xx każe
// nadawcy ponawiać, a ponawianie czegoś, co się udało, jest kolejką bez końca.
//
// Ścieżka celowo `/api/lead/inbound`, nie `/api/lead`: tę drugą przechwytuje
// Worker cloakingu (workers/edge.ts) i kieruje do własnego handlera, który o
// Supabase nic nie wie. Porównanie tam jest dokładne, więc podścieżka trafia do
// tej funkcji — ale nie warto podchodzić bliżej niż to konieczne.
//
// Zmienne środowiskowe:
//   LEAD_INBOUND_TOKEN — nagłówek x-lead-token. Bez niego endpoint jest zamknięty.

import { gradeLead } from '../_lib/lead-quality.js';
import { findRecent, logEvent, markNotified, patchLead, saveLead, shortCode } from '../_lib/leads-store.js';
import { sendLeadToTelegram } from '../_lib/telegram.js';

const TAG = '[inbound]';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/**
 * Meta oddaje odpowiedzi jako `field_data: [{ name, values: [...] }]`, a Make
 * przepuszcza je w tej formie dalej. Spłaszczamy do zwykłego obiektu, bo reszta
 * kodu (grader, karta, panel) zna tylko `{ pytanie: odpowiedź }`.
 */
function polaMeta(body) {
  const lista = Array.isArray(body.field_data) ? body.field_data : [];
  return Object.fromEntries(
    lista
      .map((f) => [str(f?.name).slice(0, 160), str(f?.values?.[0] ?? f?.value).slice(0, 120)])
      .filter(([k, v]) => k && v)
  );
}

// Meta nazywa te pola po swojemu i nie da się tego skonfigurować po naszej
// stronie — mapowanie musi być tutaj.
const ALIASY = {
  name: ['name', 'full_name', 'imie'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'phone_number', 'telefon'],
};

const zPol = (body, pola, klucz) => {
  for (const a of ALIASY[klucz]) {
    const v = str(body[a]) || str(pola[a]);
    if (v) return v;
  }
  return '';
};

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const token = process.env.LEAD_INBOUND_TOKEN;
  const podany = str(req.headers['x-lead-token']);
  if (!token || !podany || !timingSafeEqual(podany, token)) {
    console.warn(TAG, 'zły x-lead-token — odrzucone');
    res.status(401).json({ ok: false, error: 'brak lub zły x-lead-token' });
    return;
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) || {};
  const pola = polaMeta(body);
  const name = zPol(body, pola, 'name');
  const email = zPol(body, pola, 'email');
  const phone = zPol(body, pola, 'phone');

  // Imię i kontakt to minimum, bez którego nie ma do kogo oddzwonić. Odrzucamy
  // 400, bo tu po drugiej stronie jest system, a nie człowiek — i ma się o tym
  // dowiedzieć, zamiast uznać, że lead poszedł.
  if (!name || !(email || phone)) {
    console.warn(TAG, 'za mało danych', { name: !!name, email: !!email, phone: !!phone });
    res.status(400).json({ ok: false, error: 'wymagane: name oraz email albo phone' });
    return;
  }

  const answers = { ...pola, ...(body.answers && typeof body.answers === 'object' ? body.answers : {}) };
  const lead = {
    submission_id: str(body.leadgen_id || body.submission_id).slice(0, 64),
    ts: Number.isFinite(Number(body.ts)) ? Number(body.ts) : Date.now(),
    name: name.slice(0, 120),
    email: email.slice(0, 160),
    phone: phone.slice(0, 40) || null,
    phoneIso: str(body.phone_iso).slice(0, 4) || null,
    telegram: str(body.telegram).slice(0, 64) || null,
    country: str(body.country).slice(0, 60) || null,
    ref: str(body.ref).slice(0, 60) || null,
    source: str(body.source).slice(0, 40) || 'meta',
    answers,
    attribution:
      body.attribution && typeof body.attribution === 'object'
        ? body.attribution
        : { utm_source: str(body.source) || 'meta', utm_campaign: str(body.campaign_name) },
  };

  // Grader dopasowuje po TREŚCI odpowiedzi z naszego kwestionariusza („Now",
  // „didn't pass"). Meta ma własne pola i własne etykiety, więc rozpoznaje z
  // nich zero i wystawia „cold" — a to nie jest ocena, tylko jej brak. Panel
  // sortuje kolejkę po ocenie, więc opłacony lead z kampanii wylądowałby na
  // dole listy z powodu, którego nikt by nie zobaczył. Lepiej powiedzieć „nie
  // wiem" niż „słaby".
  //
  // `reasons` nie nadaje się na ten sygnał: sam telefon w zgłoszeniu dopisuje
  // tam „left a phone number", więc niepusta lista nie znaczy, że ktokolwiek
  // odpowiedział na nasze pytania.
  const ocena = gradeLead({ ...lead, answers });
  lead.quality = ocena.graded
    ? ocena
    : {
        graded: false,
        tier: null,
        score: null,
        max: ocena.max,
        tag: '#lead_unscored',
        reasons: [],
        gaps: ocena.gaps,
        penalties: ocena.penalties,
      };
  // Odrzucenie to decyzja nadawcy, nie nasza: lead z płatnej kampanii jest z
  // definicji do obdzwonienia.
  lead.outcome = str(body.outcome) === 'not_qualified' ? 'not_qualified' : 'qualified';

  const zapis = await saveLead(lead);
  if (!zapis) {
    // Jedyny przypadek, w którym prosimy o ponowienie: wiersza nie ma, więc nic
    // go nie odzyska. Watchdog nie widzi tego, czego nie zapisano.
    console.error(TAG, 'STORE FAILED', lead.email);
    res.status(503).json({ ok: false, error: 'baza nie odpowiedziała' });
    return;
  }
  lead.id = zapis.id;

  let karta = 'duplicate';
  if (!zapis.duplicate) {
    const pierwszy = await findRecent(lead);
    if (pierwszy) {
      await patchLead(lead.id, { duplicate_of: pierwszy });
      await logEvent(pierwszy, 'inbound', 'duplicate', { lead_id: lead.id, source: lead.source });
      karta = `dup of ${shortCode(pierwszy)}`;
    } else {
      const wynik = await sendLeadToTelegram(lead);
      if (wynik.skipped) karta = 'skipped';
      else {
        await markNotified(lead.id, wynik);
        karta = wynik.ok ? 'ok' : 'retry';
      }
    }
  }

  console.log(TAG, shortCode(zapis.id), lead.source, lead.quality.tier ?? 'nieoceniony', 'telegram:', karta);
  res.status(200).json({ ok: true, id: zapis.id, code: shortCode(zapis.id), duplicate: zapis.duplicate });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
