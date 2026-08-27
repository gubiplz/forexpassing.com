// GET|POST /api/leads-watchdog — cztery rzeczy, których nikt nie zauważy sam.
//
// 1. Ponowienia kart, które nie doszły na Telegram.
// 2. Alarm ciszy: „od dwunastu godzin nie ma ani jednego zgłoszenia".
// 3. Zaległości: lead ze statusem `new` starszy niż LEADS_SLA_MIN.
// 4. Przypomnienia o umówionych kontaktach (`followup_at`).
//
// Punkt 2 jest powodem, dla którego ten plik w ogóle istnieje. W sierpniu 2026
// karty przestały wpadać na czat działu i nie zauważył tego nikt przez tydzień,
// bo brak powiadomienia wygląda dokładnie tak samo jak spokojny tydzień. Cisza
// musi mieć własny głos.
//
// Wołane z zewnętrznego budzika (scenariusz Make) — ten sam mechanizm co
// /api/spots-sync i z tego samego powodu: cron na Vercel Hobby chodzi raz na
// dobę, a to jest przydatne co kilka minut.
//
// Bezstanowe i idempotentne. Pominięte wywołanie niczego nie psuje: kolejką
// ponowień jest warunek `notified_at is null` w bazie, a nie pamięć tej funkcji.
// Żeby jednak nie krzyczeć o tym samym co dziesięć minut, każdy alarm zostawia
// wpis w `lead_events` i sprawdza go przed wysłaniem następnego — historia leada
// jest tu jednocześnie dziennikiem alarmów.
//
// Zmienne środowiskowe:
//   LEADS_WATCHDOG_KEY    — sekret budzika (nagłówek x-sync-key). Bez niego 401.
//   LEADS_SLA_MIN         — po ilu minutach `new` jest zaległością (domyślnie 30)
//   LEADS_SILENCE_HOURS   — po ilu godzinach bez leada jest alarm (domyślnie 12)
//   TELEGRAM_ADMIN_CHAT_ID — dokąd idą alarmy (patrz _lib/telegram.js)

import {
  logEvent,
  markNotified,
  patchLead,
  queryEvents,
  queryLeads,
  shortCode,
} from './_lib/leads-store.js';
import { deskUrl, notifyAdmin, sendLeadToTelegram } from './_lib/telegram.js';

// Telegram przyjmuje ~20 wiadomości na minutę do jednej grupy. Większa paczka
// skończyłaby się serią 429 i drugą kolejką do posprzątania.
const BATCH = 20;
// Po pięciu próbach problem nie jest chwilowy i ma trafić do człowieka.
const MAX_PROB = 5;
// Karta wysłana chwilę po zgłoszeniu jest w drodze, nie zaginiona.
const KARENCJA_MIN = 2;
// Starsze zgłoszenia zostawiamy w spokoju: pierwszym uruchomieniem po włączeniu
// nadawcy nie chcemy wrzucić działowi na czat całej historii naraz.
const OKNO_H = 24;

const TAG = '[watchdog]';

// Ten sam wzorzec co w api/spots-sync.js: porównanie w stałym czasie, żeby
// długość dopasowanego prefiksu nie była mierzalna z zewnątrz.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const przed = (ms) => new Date(Date.now() - ms).toISOString();
const minut = (od) => Math.floor((Date.now() - new Date(od)) / 60000);
const godzina = (iso) =>
  new Date(iso).toLocaleTimeString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Jedna linia listy w alarmie: kod, ile czeka, imię i link do karty. */
const linia = (l) =>
  `• <a href="${deskUrl(l.id)}">#${shortCode(l.id)}</a> · ${minut(l.created_at)} min · ${l.name}`;

/**
 * O których z tych leadów już krzyczeliśmy.
 *
 * Jedno zapytanie na całą paczkę zamiast jednego na leada: alarm o zaległościach
 * leci co kilka minut i jego koszt musi być stały, a nie rosnąć z kolejką.
 */
async function juzZgloszone(leady, action) {
  if (!leady.length) return new Set();
  const ids = leady.map((l) => l.id).join(',');
  const było = await queryEvents(
    `lead_id=in.(${ids})&action=eq.${encodeURIComponent(action)}&select=lead_id`
  );
  return new Set(było.map((e) => e.lead_id));
}

/**
 * Karty, które nie doszły. `notified_at is null` JEST kolejką — nic poza tym
 * warunkiem nie decyduje, co tu wpada.
 *
 * Tylko `new`: lead, którego ktoś już przejął w panelu, został zobaczony i
 * ponowiona karta byłaby wtedy hałasem. Ten sam warunek trzyma z dala wiersze
 * `dropped`, które na czat nie mają prawa trafić w ogóle.
 */
async function ponowienia() {
  if (!process.env.TELEGRAM_LEADS_CHAT_ID) return { off: true };

  const czekajace = await queryLeads(
    `notified_at=is.null&deleted_at=is.null&status=eq.new` +
      `&notify_attempts=lt.${MAX_PROB}` +
      `&created_at=lt.${przed(KARENCJA_MIN * 60_000)}` +
      `&created_at=gte.${przed(OKNO_H * 3_600_000)}` +
      `&order=created_at.asc&limit=${BATCH}`
  );

  let wyslane = 0;
  let porazki = 0;
  for (const lead of czekajace) {
    const wynik = await sendLeadToTelegram(lead);
    await markNotified(lead.id, wynik, lead.notify_attempts);
    if (wynik.ok) {
      wyslane += 1;
      await logEvent(lead.id, 'watchdog', 'notified_retry', { attempt: lead.notify_attempts + 1 });
      continue;
    }
    porazki += 1;

    // Ostatnia próba przepadła — dalej to już nie jest zadanie dla ponowień.
    // Alarm leci dokładnie raz, bo od tej chwili wiersz nie spełnia warunku
    // `notify_attempts < MAX_PROB` i nigdy więcej tu nie wróci.
    if (lead.notify_attempts + 1 >= MAX_PROB) {
      await logEvent(lead.id, 'watchdog', 'dead_letter', { error: wynik.error });
      await notifyAdmin(
        `☠️ <b>Karta nie doszła po ${MAX_PROB} próbach</b>\n` +
          `#${shortCode(lead.id)} · ${lead.name} · ${lead.phone ?? 'bez numeru'}\n` +
          `Powód: ${wynik.error}\n` +
          `<a href="${deskUrl(lead.id)}">Otwórz w panelu</a>`
      );
    }
    // Telegram poprosił o przerwę — reszta paczki poczeka na następne budzenie.
    if (wynik.retryAfter) break;
  }
  return { kolejka: czekajace.length, wyslane, porazki };
}

/**
 * Cisza.
 *
 * Alarm zaczepiony o NAJNOWSZEGO leada: wpis w jego historii znaczy „o tej
 * przerwie już mówiliśmy". Kiedy zgłoszenia wrócą, kotwicą staje się nowy
 * wiersz i następna cisza znów ma prawo krzyknąć. Bez tego przy budziku co
 * dziesięć minut spokojna noc kosztowałaby siedemdziesiąt wiadomości.
 *
 * Pusta baza nie alarmuje — świeże wdrożenie nie jest awarią.
 */
async function cisza() {
  const godzin = Number(process.env.LEADS_SILENCE_HOURS ?? 12);
  if (!Number.isFinite(godzin) || godzin <= 0) return { off: true };

  const [ostatni] = await queryLeads(
    'deleted_at=is.null&status=neq.dropped&select=id,created_at,name&order=created_at.desc&limit=1'
  );
  if (!ostatni) return { pusto: true };

  const przerwaMin = minut(ostatni.created_at);
  if (przerwaMin < godzin * 60) return { przerwa_min: przerwaMin };

  const [było] = await queryEvents(
    `lead_id=eq.${ostatni.id}&action=eq.silence&select=id&limit=1`
  );
  if (było) return { przerwa_min: przerwaMin, zgloszone: true };

  await logEvent(ostatni.id, 'watchdog', 'silence', { minutes: przerwaMin });
  await notifyAdmin(
    `🔕 <b>Cisza od ${Math.floor(przerwaMin / 60)} h</b>\n` +
      `Ostatnie zgłoszenie: ${godzina(ostatni.created_at)} — ${ostatni.name}.\n` +
      `Sprawdź formularz, kampanie i ten alarm w tej kolejności.`
  );
  return { przerwa_min: przerwaMin, alarm: true };
}

/** Leady, które czekają dłużej, niż wolno. Jeden alarm na leada, nie na run. */
async function zaleglosci() {
  const sla = Number(process.env.LEADS_SLA_MIN ?? 30);
  if (!Number.isFinite(sla) || sla <= 0) return { off: true };

  const stare = await queryLeads(
    `status=eq.new&deleted_at=is.null&notified_at=not.is.null` +
      `&created_at=lt.${przed(sla * 60_000)}` +
      `&select=id,name,created_at&order=created_at.asc&limit=${BATCH}`
  );
  const znane = await juzZgloszone(stare, 'sla');
  const nowe = stare.filter((l) => !znane.has(l.id));
  if (!nowe.length) return { czeka: stare.length, alarm: false };

  for (const l of nowe) await logEvent(l.id, 'watchdog', 'sla', { minutes: minut(l.created_at) });
  await notifyAdmin(
    `⏰ <b>Nikt nie odebrał (${sla}+ min)</b>\n${nowe.map(linia).join('\n')}`
  );
  return { czeka: stare.length, alarm: nowe.length };
}

/**
 * Umówione kontakty, których termin minął.
 *
 * Po wysłaniu `followup_at` jest czyszczone — przypomnienie zostało doręczone i
 * nie ma powodu, żeby wracało co dziesięć minut. Ślad zostaje w historii leada,
 * więc „nikt mnie nie uprzedził" da się sprawdzić.
 */
async function followupy() {
  const teraz = new Date().toISOString();
  const due = await queryLeads(
    `followup_at=lte.${teraz}&deleted_at=is.null&select=id,name,owner,followup_at,created_at` +
      `&order=followup_at.asc&limit=${BATCH}`
  );
  if (!due.length) return { due: 0 };

  for (const l of due) {
    await patchLead(l.id, { followup_at: null });
    await logEvent(l.id, 'watchdog', 'followup_due', { was: l.followup_at });
  }
  await notifyAdmin(
    `🗓 <b>Zaplanowany kontakt na teraz</b>\n` +
      due
        .map(
          (l) =>
            `• <a href="${deskUrl(l.id)}">#${shortCode(l.id)}</a> · ${l.name}` +
            `${l.owner ? ` · ${l.owner}` : ''}`
        )
        .join('\n')
  );
  return { due: due.length };
}

export default async function handler(req, res) {
  // Budzik nie może dostać odpowiedzi z cache'u i uznać, że zrobił swoje.
  res.setHeader('cache-control', 'no-store');

  // Bez ustawionego sekretu endpoint jest zamknięty na głucho: brak klucza w env
  // to stan „nie skonfigurowano", nie „otwarte". Ten endpoint wysyła wiadomości
  // naszym botem i czyta dane osobowe.
  const klucz = process.env.LEADS_WATCHDOG_KEY;
  const podany = typeof req.headers['x-sync-key'] === 'string' ? req.headers['x-sync-key'].trim() : '';
  if (!klucz || !podany || !timingSafeEqual(podany, klucz)) {
    res.status(401).json({ ok: false, error: 'brak lub zły x-sync-key' });
    return;
  }

  // Po kolei, nie równolegle: wszystkie cztery piszą na ten sam czat i tym
  // samym botem, a limit Telegrama liczy się na czat, nie na zadanie.
  const wynik = {
    ponowienia: await ponowienia(),
    cisza: await cisza(),
    zaleglosci: await zaleglosci(),
    followupy: await followupy(),
  };

  console.log(TAG, JSON.stringify(wynik));
  res.status(200).json({ ok: true, ...wynik });
}
