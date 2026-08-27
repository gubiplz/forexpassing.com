// Trwały zapis leada — Supabase (tabela public.leads, patrz supabase/schema.sql).
//
// To jest źródło prawdy o zgłoszeniu. Wszystko inne — kanał na Telegramie,
// arkusz Google, LEAD_WEBHOOK — jest kopią, która może paść i którą da się
// ponowić WYŁĄCZNIE dlatego, że wiersz tutaj już jest. Kolejność w
// api/event/subscribe.js jest z tego powodu nienegocjowalna: najpierw zapis,
// potem powiadomienia.
//
// Rozmowa z bazą leci czystym fetchem do PostgREST kluczem serwisowym — ten sam
// wzorzec co api/r/[slug].js, żeby nie wciągać @supabase/supabase-js do funkcji
// serwerowej dla czterech zapytań.
//
// Żadna funkcja stąd nie rzuca. Człowiek, który właśnie wypełnił formularz, nie
// może zobaczyć błędu dlatego, że baza ma zły dzień — ale awaria musi być
// głośna w logu, bo cicha była dokładnie tym problemem, który to naprawia.

const TIMEOUT_MS = 3000;

const conf = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { base: `${url.replace(/\/$/, '')}/rest/v1`, key } : null;
};

async function rest(path, init = {}) {
  const c = conf();
  if (!c) {
    console.error('[leads] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    return null;
  }
  try {
    const res = await fetch(`${c.base}${path}`, {
      ...init,
      headers: {
        apikey: c.key,
        authorization: `Bearer ${c.key}`,
        'content-type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[leads] http', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return res;
  } catch (err) {
    console.error('[leads] request failed', err);
    return null;
  }
}

const rows = async (res) => (res ? await res.json().catch(() => []) : []);

/** Cztery znaki, którymi da się o leadzie powiedzieć na głos i wpisać w wyszukiwarkę. */
export const shortCode = (id) => String(id ?? '').replace(/-/g, '').slice(0, 4).toUpperCase();

const kolumny = (lead) => ({
  submission_id: lead.submission_id || null,
  ...(Number.isFinite(lead.ts) ? { created_at: new Date(lead.ts).toISOString() } : {}),
  name: lead.name || '—',
  email: lead.email || '',
  phone: lead.phone || null,
  phone_iso: lead.phoneIso || null,
  telegram: lead.telegram || null,
  country: lead.country || null,
  ref: lead.ref || null,
  source: lead.source || 'safe',
  outcome: lead.outcome === 'not_qualified' ? 'not_qualified' : 'qualified',
  tier: lead.quality?.tier ?? null,
  score: Number.isFinite(lead.quality?.score) ? lead.quality.score : null,
  quality: lead.quality ?? null,
  answers: lead.answers ?? {},
  attribution: lead.attribution ?? {},
  ip: lead.ip || null,
  ua: lead.ua || null,
  ...(lead.status ? { status: lead.status } : {}),
  ...(lead.note ? { note: lead.note } : {}),
});

/**
 * Wiersz leada. Zwraca { id, duplicate } albo null, gdy zapis się nie udał.
 *
 * `duplicate` znaczy „to samo wypełnienie formularza przyszło drugi raz" —
 * przeglądarka ponowiła wysyłkę po zerwanej sieci. Wiersz jest jeden, a
 * wołający wie, że nie ma o czym drugi raz powiadamiać.
 *
 * Konflikt rozstrzyga baza (unique na submission_id) przez ignore-duplicates,
 * a nie odczyt-i-zapis w kodzie: dwa równoległe POST-y z tej samej przeglądarki
 * przy takim sprawdzeniu zdążyłyby założyć dwa wiersze.
 */
export async function saveLead(lead) {
  const res = await rest('/leads?on_conflict=submission_id', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(kolumny(lead)),
  });
  const [wiersz] = await rows(res);
  if (wiersz?.id) return { id: wiersz.id, duplicate: false };
  if (!res) return null;

  // Pusta odpowiedź przy ignore-duplicates = wiersz już istniał. Dopiero teraz
  // pytamy o jego id — jedno dodatkowe zapytanie na ścieżce, która zdarza się
  // rzadko, zamiast selecta przed każdym zapisem.
  if (!lead.submission_id) return null;
  const stary = await rest(
    `/leads?submission_id=eq.${encodeURIComponent(lead.submission_id)}&select=id&limit=1`
  );
  const [istniejacy] = await rows(stary);
  return istniejacy?.id ? { id: istniejacy.id, duplicate: true } : null;
}

/**
 * Ten sam człowiek zgłaszający się drugi raz w krótkim odstępie (inny
 * submission_id — nowa karta, nowe wypełnienie). Zwraca id pierwszego wiersza.
 *
 * Telefon porównywany po kolumnie phone_digits, którą liczy baza: „+48 601 234
 * 567" i „601234567" to ten sam numer, a formularz przyjmuje oba zapisy.
 */
export async function findRecent({ id, email, phone }, minutes = 10) {
  const od = new Date(Date.now() - minutes * 60_000).toISOString();
  const cyfry = String(phone ?? '').replace(/\D/g, '');
  const warunki = [];
  // Wartości w cudzysłowach, bo PostgREST tnie listę `or=(…)` po przecinkach,
  // a adres z przecinkiem rozjechałby całe zapytanie.
  if (email) warunki.push(`email.ilike."${email.replace(/["*\\]/g, '')}"`);
  if (cyfry.length >= 7) warunki.push(`phone_digits.ilike."*${cyfry.slice(-9)}"`);
  if (!warunki.length) return null;

  const res = await rest(
    `/leads?created_at=gte.${od}&deleted_at=is.null&status=neq.dropped` +
      `&or=(${warunki.join(',')})&select=id,created_at&order=created_at.asc&limit=3`
  );
  const znalezione = (await rows(res)).filter((r) => r.id !== id);
  return znalezione[0]?.id ?? null;
}

/** Dopisek do istniejącego wiersza. Zwraca true/false, nigdy nie rzuca. */
export async function patchLead(id, dane) {
  if (!id) return false;
  const res = await rest(`/leads?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify(dane),
  });
  return Boolean(res);
}

/**
 * Zmiana statusu, która przechodzi tylko z konkretnego stanu wyjściowego.
 *
 * Warunek `status=eq.<z>` idzie do bazy, więc dwóch operatorów klikających
 * „Przejmuję" w tej samej sekundzie rozstrzyga Postgres, a nie kolejność
 * wywołań w Node. Pusta tablica w odpowiedzi znaczy „ktoś był szybszy" —
 * i tylko wtedy.
 */
export async function moveStatus(id, z, dane) {
  const res = await rest(
    `/leads?id=eq.${encodeURIComponent(id)}&status=eq.${encodeURIComponent(z)}`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(dane),
    }
  );
  const [wiersz] = await rows(res);
  return wiersz ?? null;
}

/**
 * Wynik wysyłki na Telegram. Przy porażce `notified_at` ZOSTAJE puste — to jest
 * cała kolejka ponowień: watchdog czyta dokładnie ten warunek.
 */
export async function markNotified(id, wynik, proby = 0) {
  if (!id) return false;
  return patchLead(id, {
    notify_attempts: proby + 1,
    ...(wynik.ok
      ? {
          notified_at: new Date().toISOString(),
          notify_error: null,
          notify_chat_id: wynik.chatId ? String(wynik.chatId) : null,
          notify_msg_id: wynik.messageId ?? null,
        }
      : { notify_error: String(wynik.error ?? 'unknown').slice(0, 300) }),
  });
}

/** Wpis do historii leada. Bez tego „przecież dzwoniłem" jest nie do sprawdzenia. */
export async function logEvent(leadId, actor, action, detail) {
  if (!leadId) return false;
  const res = await rest('/lead_events', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      lead_id: leadId,
      actor: String(actor ?? 'system').slice(0, 60),
      action: String(action ?? '').slice(0, 60),
      detail: detail ?? null,
    }),
  });
  return Boolean(res);
}

/** Dowolne zapytanie czytające. Zwraca tablicę — pustą przy awarii. */
export async function queryLeads(query) {
  return rows(await rest(`/leads?${query}`));
}

/** To samo po historii. Watchdog czyta stąd, czy już o czymś krzyczał. */
export async function queryEvents(query) {
  return rows(await rest(`/lead_events?${query}`));
}

/**
 * Agregat policzony przez Postgresa (patrz supabase/schema.sql).
 *
 * Raport za kwartał to kilka tysięcy wierszy; ściąganie ich tutaj po to, żeby
 * zwrócić kilkanaście liczb, kosztowałoby pamięć funkcji i czas odpowiedzi.
 */
export async function callRpc(nazwa, args) {
  return rows(await rest(`/rpc/${nazwa}`, { method: 'POST', body: JSON.stringify(args) }));
}

export async function getLead(id) {
  if (!id) return null;
  const [wiersz] = await rows(await rest(`/leads?id=eq.${encodeURIComponent(id)}&limit=1`));
  return wiersz ?? null;
}
