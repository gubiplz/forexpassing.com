// GET|POST /api/desk — panel działu. Jedna funkcja, HTML składany po stronie
// serwera, zero builda i zero SPA.
//
// Dlaczego nie strona w aplikacji: `src/App.tsx` routuje przez `subPageFor()` z
// `src/runtime/`, a to jest strefa, której nie ruszamy. Funkcja `/api/*` omija
// ten routing w całości, więc panel nie może zepsuć lejka — i odwrotnie.
//
// Adres: `/desk` (rewrite w vercel.json) albo wprost `/api/desk`. Oba działają
// i to jest celowe: `/desk` przechodzi przez Workera cloakingu, który przy
// awarii swojego pipeline'u podaje stronę `/safe`. Operator, któremu panel
// zamienił się w landing, ma wtedy drugie wejście, które Worker przepuszcza
// jako API.
//
// Sortowanie kolejki jest odwrotne niż wszędzie indziej: NAJSTARSZY nieobsłużony
// na górze. Lista od najnowszego pokazuje pracę, która może poczekać, i chowa na
// dole tę, która czeka najdłużej — czyli dokładnie tę, o którą chodzi.
//
// Zmienne środowiskowe: DESK_USERS, DESK_COOKIE_SECRET (patrz _lib/desk-auth.js),
// LEADS_SLA_MIN — po ilu minutach czas oczekiwania robi się czerwony.

import {
  callRpc,
  getLead,
  logEvent,
  moveStatus,
  patchLead,
  queryEvents,
  queryLeads,
  shortCode,
} from '../_lib/leads-store.js';
import {
  panelWlaczony,
  sesja,
  sprawdzLogin,
  tokenOk,
  ustawSesje,
  wyczyscSesje,
} from '../_lib/desk-auth.js';

const TAG = '[desk]';

const STATUSY = {
  new: 'Nowy',
  claimed: 'Przejęty',
  contacted: 'Oddzwoniony',
  booked: 'Umówiony',
  won: 'Kupił',
  lost: 'Przegrany',
  spam: 'Spam',
  dropped: 'Odrzucone',
};

// Kolejka robocza. `dropped` i `spam` w niej nie są: to nie jest praca.
const OTWARTE = ['new', 'claimed', 'contacted', 'booked'];

// Bez powodu raport odpowiada „ilu przegraliśmy", a nie „dlaczego" — i nie da
// się na jego podstawie niczego zmienić.
const POWODY = ['za drogo', 'nie odbiera', 'kupił gdzie indziej', 'nie kwalifikuje się', 'inne'];

const PRZEJSCIA = {
  claim: { na: 'claimed', z: 'new', etykieta: '🙋 Przejmuję' },
  called: { na: 'contacted', etykieta: '📞 Oddzwonione' },
  booked: { na: 'booked', etykieta: '🗓 Umówiony' },
  won: { na: 'won', etykieta: '✅ Kupił' },
  lost: { na: 'lost', etykieta: '❌ Przegrany' },
  spam: { na: 'spam', etykieta: '🚫 Spam' },
  reopen: { na: 'contacted', etykieta: '↩️ Wróć do obsługi' },
};

/** Który zestaw przycisków ma sens przy tym stanie — nie proponujemy kroku, który już padł. */
function przyciskiDla(status) {
  if (status === 'new') return ['claim', 'called', 'spam'];
  if (status === 'claimed') return ['called', 'booked', 'lost', 'spam'];
  if (status === 'contacted') return ['booked', 'won', 'lost'];
  if (status === 'booked') return ['won', 'lost'];
  return ['reopen'];
}

// ─── Formatowanie ────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const minut = (od) => Math.floor((Date.now() - new Date(od)) / 60000);

const czas = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pl-PL', {
        timeZone: 'Europe/Warsaw',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** „47 min" do godziny, potem „3 h 20 min" — minuty przestają być czytelne. */
function czekanie(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} dni`;
}

const sla = () => {
  const n = Number(process.env.LEADS_SLA_MIN ?? 30);
  return Number.isFinite(n) && n > 0 ? n : 30;
};

// ❔ to nie „zimny" — to lead spoza kwestionariusza, którego grader nie miał jak
// ocenić (patrz api/lead/inbound.js). Wrzucenie go do jednego worka z „cold"
// zepchnęłoby opłacony lead z kampanii na dół kolejki bez żadnego powodu.
const znacznik = (t) => (t === 'high' ? '🔥' : t === 'warm' ? '🟡' : t === 'cold' ? '⚪️' : '❔');

// ─── Zapytania ───────────────────────────────────────────────────────────────

const KOLUMNY_LISTY =
  'id,created_at,name,email,phone,source,tier,score,status,owner,first_contact_at,followup_at,notified_at,duplicate_of';

/**
 * Wzorzec ilike odporny na polskie znaki.
 *
 * Każda litera, która ma wariant z ogonkiem, staje się `_` — a `_` w LIKE to
 * dokładnie jeden dowolny znak. Dzięki temu „Zielinski" trafia w „Zieliński" i
 * odwrotnie, bez rozszerzenia `unaccent` po stronie bazy. Operator wpisujący
 * nazwisko z klawiatury bez polskich znaków musi coś znaleźć.
 *
 * Regex (`imatch`) dałby wzorzec dokładniejszy, ale przy starszym PostgREŚCIE
 * zapytanie kończy się błędem, a błąd u nas znaczy pustą listę — czyli „nie ma
 * takiego leada". Szeroko i zawsze jest tu lepsze niż wąsko i czasem.
 */
function wzorzec(fraza) {
  return fraza
    .replace(/[%*"\\(),]/g, '') // znaki sterujące PostgREST-a i LIKE
    .replace(/[aącćeęlłnńoósśzżź]/gi, '_');
}

async function lista(p, kolumny = KOLUMNY_LISTY, limit = 100) {
  const w = ['deleted_at=is.null'];
  const fraza = String(p.q ?? '').trim();
  // Szukanie znaczy „znajdź tego człowieka", nie „przefiltruj kolejkę". Domyślny
  // filtr kolejki musi więc ustąpić: klient sprzed miesiąca, który właśnie
  // oddzwonił, ma się znaleźć, choć dawno wypadł ze stanów w obsłudze.
  const status = p.status || (fraza ? 'all' : 'open');
  if (status === 'open') w.push(`status=in.(${OTWARTE.join(',')})`);
  else if (status !== 'all' && STATUSY[status]) w.push(`status=eq.${status}`);
  if (p.tier) w.push(`tier=eq.${encodeURIComponent(p.tier)}`);
  if (p.source) w.push(`source=eq.${encodeURIComponent(p.source)}`);
  if (p.owner) w.push(`owner=eq.${encodeURIComponent(p.owner)}`);

  const cyfry = fraza.replace(/\D/g, '');
  if (fraza) {
    const wz = wzorzec(fraza);
    const lub = [`name.ilike."*${wz}*"`, `email.ilike."*${wz}*"`];
    // Trzy cyfry wystarczą: operator czyta końcówkę numeru z ekranu telefonu,
    // rzadko przepisuje go w całości.
    if (cyfry.length >= 3) lub.push(`phone_digits.ilike."*${cyfry}*"`);
    w.push(`or=(${lub.join(',')})`);
  }

  // Kolejka robocza od najstarszego; archiwum od najnowszego. W pierwszym
  // przypadku szukamy zaległości, w drugim — tego, co się właśnie wydarzyło.
  const kierunek = status === 'open' || status === 'new' ? 'asc' : 'desc';
  const wiersze = await queryLeads(
    `${w.join('&')}&select=${kolumny}&order=created_at.${kierunek}&limit=${limit}`
  );

  // Krótki kod jest identyfikatorem do wymówienia na głos, nie kolumną w bazie —
  // liczy się go z uuid-a, więc bazy o niego zapytać nie można. Przy czterech
  // znakach heksadecymalnych filtrujemy to, co już przyszło.
  return /^[0-9a-f]{4}$/i.test(fraza)
    ? wiersze.filter((l) => shortCode(l.id) === fraza.toUpperCase())
    : wiersze;
}

// ─── Widoki ──────────────────────────────────────────────────────────────────

const STYL = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0f1115;color:#e6e8ee;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:#7cc4ff}
header{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;background:#161a22;border-bottom:1px solid #262c38;position:sticky;top:0;z-index:5}
header b{font-size:16px}
main{padding:16px;max-width:900px;margin:0 auto}
.muted{color:#8b93a7}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#232a36;font-size:12px}
.late{color:#ff6b6b;font-weight:700}
form.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
input,select,textarea,button{font-size:16px;font-family:inherit}
input,select,textarea{background:#161a22;color:#e6e8ee;border:1px solid #2c3444;border-radius:8px;padding:10px}
textarea{width:100%;min-height:90px}
button{border:0;border-radius:8px;padding:11px 14px;background:#2b6cb0;color:#fff;font-weight:600;cursor:pointer;min-height:44px}
button.ghost{background:#232a36}
.rows{display:flex;flex-direction:column;gap:8px}
.row{display:block;padding:12px;background:#161a22;border:1px solid #222835;border-radius:10px;text-decoration:none;color:inherit}
.row:active{background:#1c2230}
.row .top{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.row .name{font-weight:600}
.card{background:#161a22;border:1px solid #222835;border-radius:12px;padding:16px;margin-bottom:16px}
.card h2{margin:0 0 12px;font-size:17px}
.big{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.big a,.big button{flex:1 1 46%;text-align:center;text-decoration:none;line-height:22px;padding:11px 14px;border-radius:8px;background:#2b6cb0;color:#fff;font-weight:600}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.acts button{flex:1 1 46%}
dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
dt{color:#8b93a7}
dd{margin:0;overflow-wrap:anywhere}
ol.hist{margin:0;padding-left:18px}
ol.hist li{margin-bottom:4px}
.err{background:#3a1d1d;border:1px solid #6b2b2b;padding:10px;border-radius:8px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:14px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #222835}
th{color:#8b93a7;font-weight:600}
@media(min-width:640px){.big a,.big button{flex:1 1 22%}}
`;

const strona = (tytul, tresc, ses) => `<!doctype html><html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(tytul)}</title><style>${STYL}</style>
</head><body><header><b><a href="/desk" style="color:inherit;text-decoration:none">Leady</a></b>
${
  ses
    ? `<form method="post" action="/desk"><input type="hidden" name="action" value="logout">
       <input type="hidden" name="token" value="${esc(ses.token)}">
       <span class="muted">${esc(ses.imie)}</span> <button class="ghost">Wyloguj</button></form>`
    : ''
}
</header><main>${tresc}</main></body></html>`;

const ekranLogowania = (blad) =>
  strona(
    'Panel',
    `${blad ? `<p class="err">${esc(blad)}</p>` : ''}
     <form method="post" action="/desk" class="card">
       <input type="hidden" name="action" value="login">
       <p><input name="imie" placeholder="Imię" autocomplete="username" autofocus style="width:100%"></p>
       <p><input name="haslo" type="password" placeholder="Hasło" autocomplete="current-password" style="width:100%"></p>
       <button style="width:100%">Wejdź</button>
     </form>`,
    null
  );

function wierszListy(l, prog) {
  const czeka = minut(l.created_at);
  const spozniony = l.status === 'new' && czeka >= prog;
  return `<a class="row" href="/desk?id=${esc(l.id)}">
    <div class="top">
      <span class="${spozniony ? 'late' : 'muted'}">${spozniony ? '⚠️ ' : ''}${czekanie(czeka)}</span>
      <span>${znacznik(l.tier)} ${l.score ?? '–'}/9</span>
      <span class="name">${esc(l.name)}</span>
      <span class="pill">${esc(STATUSY[l.status] ?? l.status)}</span>
      ${l.owner ? `<span class="pill">${esc(l.owner)}</span>` : ''}
      ${l.duplicate_of ? '<span class="pill">dubel</span>' : ''}
      ${l.notified_at ? '' : '<span class="pill">bez karty</span>'}
    </div>
    <div class="muted">#${shortCode(l.id)} · ${esc(l.phone ?? l.email)} · ${esc(l.source)}</div>
  </a>`;
}

/** Eksport ma oddać to, co operator widzi — więc niesie te same filtry. */
const csvQuery = (p) => {
  const q = new URLSearchParams({ view: 'csv' });
  for (const k of ['q', 'status', 'tier', 'source', 'owner']) {
    if (p[k]) q.set(k, String(p[k]));
  }
  return esc(q.toString());
};

function widokListy(wiersze, czekajace, p, ses) {
  const prog = sla();
  const najstarszy = czekajace[0] ? minut(czekajace[0].created_at) : 0;
  const opcje = (nazwa, wybrane, pary) =>
    `<select name="${nazwa}" onchange="this.form.submit()">${pary
      .map(
        ([v, t]) =>
          `<option value="${esc(v)}"${v === wybrane ? ' selected' : ''}>${esc(t)}</option>`
      )
      .join('')}</select>`;

  return strona(
    'Leady',
    `<p><b>Czekają: ${czekajace.length}</b>${
      najstarszy >= prog
        ? ` <span class="late">⚠️ najdłużej: ${czekanie(najstarszy)}</span>`
        : najstarszy
          ? ` <span class="muted">najdłużej: ${czekanie(najstarszy)}</span>`
          : ''
    }</p>
    <form class="filters" method="get" action="/desk">
      <input name="q" value="${esc(p.q ?? '')}" placeholder="Nazwisko, mail, numer, #kod" style="flex:1 1 240px">
      ${opcje('status', p.status || (String(p.q ?? '').trim() ? 'all' : 'open'), [
        ['open', 'W obsłudze'],
        ['all', 'Wszystkie'],
        ...Object.entries(STATUSY),
      ])}
      ${opcje('tier', p.tier ?? '', [
        ['', 'Każdy tier'],
        ['high', '🔥 high'],
        ['warm', '🟡 warm'],
        ['cold', '⚪️ cold'],
      ])}
      <label class="pill" style="padding:10px 12px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" name="owner" value="${esc(ses.imie)}"${
          p.owner === ses.imie ? ' checked' : ''
        } onchange="this.form.submit()"> Tylko moje
      </label>
      <button>Szukaj</button>
    </form>
    ${
      wiersze.length
        ? `<div class="rows">${wiersze.map((l) => wierszListy(l, prog)).join('')}</div>`
        : '<p class="muted">Nic nie pasuje do tych filtrów.</p>'
    }
    <p class="muted" style="margin-top:16px">
      <a href="/desk?view=report">📊 Raport</a> ·
      <a href="/desk?${csvQuery(p)}">⬇️ Eksport CSV (te filtry)</a>
    </p>`,
    ses
  );
}

function widokKarty(lead, historia, ses) {
  const tel = String(lead.phone ?? '').replace(/[^\d+]/g, '');
  const tg = String(lead.telegram ?? '').replace(/^@/, '');
  const odp = Object.entries(lead.answers ?? {});
  const za = lead.quality?.reasons ?? [];
  const braki = lead.quality?.gaps ?? [];

  const akcje = przyciskiDla(lead.status)
    .map(
      (k) => `<button name="do" value="${k}"${
        k === 'claim' && lead.owner ? ' class="ghost"' : ''
      }>${PRZEJSCIA[k].etykieta}</button>`
    )
    .join('');

  return strona(
    `#${shortCode(lead.id)} ${lead.name}`,
    `<div class="card">
      <h2>${znacznik(lead.tier)} ${esc(lead.name)} <span class="muted">#${shortCode(lead.id)}</span></h2>
      <div class="big">
        ${tel ? `<a href="tel:${esc(tel)}">📞 Zadzwoń</a>` : ''}
        ${tg ? `<a href="https://t.me/${esc(tg)}">✈️ Telegram</a>` : ''}
        ${lead.email ? `<a href="mailto:${esc(lead.email)}">✉️ Mail</a>` : ''}
        ${tel ? `<button type="button" class="ghost" data-kopiuj="${esc(tel)}">📋 Kopiuj numer</button>` : ''}
      </div>
      <dl>
        <dt>Status</dt><dd>${esc(STATUSY[lead.status] ?? lead.status)}${
          lead.lost_reason ? ` — ${esc(lead.lost_reason)}` : ''
        }</dd>
        <dt>Opiekun</dt><dd>${esc(lead.owner ?? '—')}</dd>
        <dt>Telefon</dt><dd>${esc(lead.phone ?? '—')} ${esc(lead.country ?? '')}</dd>
        <dt>E-mail</dt><dd>${esc(lead.email)}</dd>
        <dt>Zgłoszenie</dt><dd>${czas(lead.created_at)} · czeka ${czekanie(minut(lead.created_at))}</dd>
        <dt>Pierwszy kontakt</dt><dd>${czas(lead.first_contact_at)}</dd>
        <dt>Źródło</dt><dd>${esc(lead.source)}${lead.ref ? ` · ref ${esc(lead.ref)}` : ''}</dd>
        <dt>Jakość</dt><dd>${lead.score ?? '–'}/9 · ${esc(lead.tier ?? '—')} · ${esc(lead.outcome)}</dd>
        <dt>Karta na czacie</dt><dd>${
          lead.notified_at
            ? czas(lead.notified_at)
            : `<span class="late">nie doszła</span> (prób: ${lead.notify_attempts}${
                lead.notify_error ? `, ${esc(lead.notify_error)}` : ''
              })`
        }</dd>
        ${lead.duplicate_of ? `<dt>Dubel</dt><dd><a href="/desk?id=${esc(lead.duplicate_of)}">pierwsze zgłoszenie</a></dd>` : ''}
      </dl>
      ${za.length ? `<p class="muted">Za: ${esc(za.join(' · '))}</p>` : ''}
      ${braki.length ? `<p class="muted">Braki: ${esc(braki.join(' · '))}</p>` : ''}
    </div>

    <form class="card" method="post" action="/desk">
      <input type="hidden" name="action" value="status">
      <input type="hidden" name="id" value="${esc(lead.id)}">
      <input type="hidden" name="token" value="${esc(ses.token)}">
      <h2>Zmień stan</h2>
      <div class="acts">${akcje}</div>
      <p class="muted" style="margin-bottom:4px">Powód przegranej (dla „Przegrany"):</p>
      <select name="powod" style="width:100%">
        <option value="">— wybierz —</option>
        ${POWODY.map(
          (r) => `<option${r === lead.lost_reason ? ' selected' : ''}>${esc(r)}</option>`
        ).join('')}
      </select>
    </form>

    <form class="card" method="post" action="/desk">
      <input type="hidden" name="action" value="note">
      <input type="hidden" name="id" value="${esc(lead.id)}">
      <input type="hidden" name="token" value="${esc(ses.token)}">
      <h2>Notatka i termin</h2>
      <textarea name="note" data-lead="${esc(lead.id)}" placeholder="Co ustaliliście">${esc(lead.note ?? '')}</textarea>
      <p><label class="muted">Przypomnij o kontakcie:</label><br>
        <input type="datetime-local" name="kiedy" value="${esc(lokalnie(lead.followup_at))}"></p>
      <button>Zapisz</button>
    </form>

    ${
      odp.length
        ? `<div class="card"><h2>Odpowiedzi</h2><dl>${odp
            .map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`)
            .join('')}</dl></div>`
        : ''
    }

    <div class="card"><h2>Historia</h2>
      ${
        historia.length
          ? `<ol class="hist">${historia
              .map(
                (e) =>
                  `<li><span class="muted">${czas(e.at)}</span> ${esc(e.actor)} — ${esc(e.action)}</li>`
              )
              .join('')}</ol>`
          : '<p class="muted">Nic jeszcze się nie wydarzyło.</p>'
      }
    </div>

    <script>
    document.querySelectorAll('[data-kopiuj]').forEach(function(b){
      b.addEventListener('click',function(){
        navigator.clipboard.writeText(b.dataset.kopiuj).then(function(){b.textContent='📋 Skopiowane'});
      });
    });
    // Notatka pisana przy wygasłej sesji ginęłaby razem z przekierowaniem na
    // ekran logowania. Szkic zostaje lokalnie do chwili, w której serwer odda
    // dokładnie tę samą treść — czyli do potwierdzonego zapisu.
    (function(){
      var t=document.querySelector('textarea[name=note]'); if(!t) return;
      var k='desk-note-'+t.dataset.lead, s=localStorage.getItem(k);
      if(s===t.value) localStorage.removeItem(k); else if(s) t.value=s;
      t.addEventListener('input',function(){localStorage.setItem(k,t.value)});
    })();
    </script>`,
    ses
  );
}

function tabelaRaportu(naglowek, wiersze) {
  if (!wiersze.length) return `<h2>${esc(naglowek)}</h2><p class="muted">Brak danych.</p>`;
  const proc = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  return `<h2>${esc(naglowek)}</h2>
    <table><tr><th>${esc(naglowek)}</th><th>Leadów</th><th>Kupiło</th><th>Konwersja</th>
      <th>Mediana 1. kontaktu</th><th>Bez kontaktu</th></tr>
    ${wiersze
      .map(
        (r) => `<tr><td>${esc(r.klucz)}</td><td>${r.leadow}</td><td>${r.kupilo}</td>
          <td>${proc(r.kupilo, r.leadow)}</td>
          <td>${r.mediana_kontaktu === null ? '—' : czekanie(Math.round(r.mediana_kontaktu))}</td>
          <td${r.bez_kontaktu ? ' class="late"' : ''}>${r.bez_kontaktu}</td></tr>`
      )
      .join('')}</table>`;
}

function widokRaportu(dni, wgZrodla, wgKampanii, powody, ses) {
  return strona(
    'Raport',
    `<form method="get" action="/desk" class="filters">
      <input type="hidden" name="view" value="report">
      <select name="dni" onchange="this.form.submit()">
        ${[7, 30, 90, 365]
          .map((d) => `<option value="${d}"${d === dni ? ' selected' : ''}>ostatnie ${d} dni</option>`)
          .join('')}
      </select>
      <a href="/desk" style="align-self:center">← kolejka</a>
    </form>
    <div class="card">${tabelaRaportu('Źródło', wgZrodla)}</div>
    <div class="card">${tabelaRaportu('Kampania', wgKampanii)}</div>
    <div class="card"><h2>Dlaczego przegrywamy</h2>
      ${
        powody.length
          ? `<table><tr><th>Powód</th><th>Ile</th></tr>${powody
              .map((r) => `<tr><td>${esc(r.powod)}</td><td>${r.ile}</td></tr>`)
              .join('')}</table>`
          : '<p class="muted">Żaden lead nie został jeszcze zamknięty jako przegrany.</p>'
      }
    </div>`,
    ses
  );
}

/**
 * Jedno pole CSV.
 *
 * Wiodące `=`, `+`, `-`, `@` Excel i Arkusze czytają jako formułę, więc
 * `=HYPERLINK(...)` wpisany w formularz wykona się na maszynie tego, kto otworzy
 * eksport. Apostrof z przodu zamienia to z powrotem w tekst.
 */
function polCsv(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const CSV_KOLUMNY = [
  ['kod', (l) => shortCode(l.id)],
  ['data', (l) => czas(l.created_at)],
  ['imie', (l) => l.name],
  ['email', (l) => l.email],
  ['telefon', (l) => l.phone],
  ['telegram', (l) => l.telegram],
  ['kraj', (l) => l.country],
  ['zrodlo', (l) => l.source],
  ['kampania', (l) => l.attribution?.utm_campaign],
  ['tier', (l) => l.tier],
  ['score', (l) => l.score],
  ['status', (l) => STATUSY[l.status] ?? l.status],
  ['opiekun', (l) => l.owner],
  ['powod_przegranej', (l) => l.lost_reason],
  ['pierwszy_kontakt', (l) => czas(l.first_contact_at)],
  ['minut_do_kontaktu', (l) => (l.first_contact_at ? minut(l.created_at) - minut(l.first_contact_at) : '')],
  ['notatka', (l) => l.note],
];

/** `datetime-local` nie przyjmuje strefy, a operator myśli w swojej. */
function lokalnie(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const w = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  return `${w.getFullYear()}-${p(w.getMonth() + 1)}-${p(w.getDate())}T${p(w.getHours())}:${p(w.getMinutes())}`;
}

// ─── Obsługa ─────────────────────────────────────────────────────────────────

const pola = (req) =>
  typeof req.body === 'string'
    ? Object.fromEntries(new URLSearchParams(req.body))
    : req.body && typeof req.body === 'object'
      ? req.body
      : {};

function wyslij(res, html, status = 200) {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  res.status(status).send(html);
}

/** Po zapisie przekierowanie, nie HTML: odświeżenie strony nie powtarza akcji. */
function wroc(res, dokad) {
  res.setHeader('location', dokad);
  res.setHeader('cache-control', 'no-store');
  res.status(303).end();
}

async function zmienStan(f, ses) {
  const przejscie = PRZEJSCIA[String(f.do ?? '')];
  const id = String(f.id ?? '');
  if (!przejscie || !id) return;

  const lead = await getLead(id);
  if (!lead) return;

  const teraz = new Date().toISOString();
  const dane = { status: przejscie.na };
  if (!lead.owner) dane.owner = ses.imie;
  if (przejscie.na === 'claimed') dane.claimed_at = teraz;
  // Tylko raz: czas do PIERWSZEGO kontaktu jest miarą, którą ten panel ma
  // poprawiać, więc drugie „oddzwonione" nie może pokazać lepszego wyniku.
  if (!lead.first_contact_at && ['contacted', 'booked', 'won'].includes(przejscie.na)) {
    dane.first_contact_at = teraz;
  }
  if (przejscie.na === 'lost') dane.lost_reason = String(f.powod ?? '').slice(0, 60) || 'inne';

  // Przejęcie rozstrzyga Postgres, nie kolejność wywołań: warunek `status=eq.new`
  // jedzie do bazy razem z zapisem, więc dwóch operatorów dostaje jednego opiekuna.
  if (przejscie.z && !(await moveStatus(id, przejscie.z, dane))) return;
  if (!przejscie.z && !(await patchLead(id, dane))) return;

  await logEvent(id, ses.imie, `status:${przejscie.na}`, {
    from: lead.status,
    to: przejscie.na,
    via: 'desk',
  });
  console.log(TAG, shortCode(id), lead.status, '→', przejscie.na, 'przez', ses.imie);
}

async function zapiszNotatke(f, ses) {
  const id = String(f.id ?? '');
  if (!id) return;
  const note = String(f.note ?? '').slice(0, 4000);
  const kiedy = String(f.kiedy ?? '').trim();
  const termin = kiedy ? new Date(kiedy) : null;

  await patchLead(id, {
    note: note || null,
    followup_at: termin && !Number.isNaN(termin.getTime()) ? termin.toISOString() : null,
  });
  await logEvent(id, ses.imie, 'note', { length: note.length, followup: kiedy || null });
}

export default async function handler(req, res) {
  if (!panelWlaczony()) {
    // Brak DESK_USERS albo DESK_COOKIE_SECRET to stan „nie skonfigurowano", nie
    // „otwarte" — panel pokazuje dane osobowe wszystkich leadów.
    wyslij(res, strona('Panel', '<p class="err">Panel nie jest skonfigurowany.</p>', null), 503);
    return;
  }

  const ses = sesja(req);
  const f = req.method === 'POST' ? pola(req) : {};

  if (req.method === 'POST' && f.action === 'login') {
    const imie = sprawdzLogin(f.imie, f.haslo);
    if (!imie) {
      // Jeden komunikat na złe hasło i na nieistniejące konto: rozróżnienie
      // zdradza, które nazwy są prawdziwe.
      wyslij(res, ekranLogowania('Nie ta nazwa albo nie to hasło.'), 401);
      return;
    }
    ustawSesje(res, imie);
    console.log(TAG, 'zalogowany', imie);
    wroc(res, '/desk');
    return;
  }

  if (!ses) {
    wyslij(res, ekranLogowania(''), req.method === 'POST' ? 401 : 200);
    return;
  }

  if (req.method === 'POST') {
    if (!tokenOk(ses, f.token)) {
      console.warn(TAG, 'zły token formularza', ses.imie);
      wyslij(res, strona('Panel', '<p class="err">Formularz wygasł. Odśwież i spróbuj raz jeszcze.</p>', ses), 403);
      return;
    }
    if (f.action === 'logout') {
      wyczyscSesje(res);
      wroc(res, '/desk');
      return;
    }
    if (f.action === 'status') await zmienStan(f, ses);
    if (f.action === 'note') await zapiszNotatke(f, ses);
    wroc(res, f.id ? `/desk?id=${encodeURIComponent(String(f.id))}` : '/desk');
    return;
  }

  const p = req.query ?? {};

  if (p.view === 'report') {
    const dni = [7, 30, 90, 365].includes(Number(p.dni)) ? Number(p.dni) : 30;
    const od = new Date(Date.now() - dni * 86_400_000).toISOString();
    const [wgZrodla, wgKampanii, powody] = await Promise.all([
      callRpc('lead_report', { od, wymiar: 'source' }),
      callRpc('lead_report', { od, wymiar: 'campaign' }),
      callRpc('lead_lost_reasons', { od }),
    ]);
    wyslij(res, widokRaportu(dni, wgZrodla, wgKampanii, powody, ses));
    return;
  }

  if (p.view === 'csv') {
    const wiersze = await lista(p, `${KOLUMNY_LISTY},telegram,country,attribution,lost_reason,note`, 5000);
    const csv = [
      CSV_KOLUMNY.map(([n]) => polCsv(n)).join(','),
      ...wiersze.map((l) => CSV_KOLUMNY.map(([, f]) => polCsv(f(l))).join(',')),
    ].join('\r\n');
    console.log(TAG, 'eksport', wiersze.length, 'wierszy przez', ses.imie);
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="leady-${Date.now()}.csv"`);
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-robots-tag', 'noindex, nofollow');
    // BOM, bo bez niego Excel na Windowsie czyta UTF-8 jako cp1250 i „Zieliński"
    // przyjeżdża jako „ZieliÅ„ski".
    res.status(200).send(`﻿${csv}`);
    return;
  }

  if (p.id) {
    const lead = await getLead(String(p.id));
    if (!lead) {
      wyslij(res, strona('Panel', '<p class="err">Nie ma takiego leada.</p>', ses), 404);
      return;
    }
    const historia = await queryEvents(
      `lead_id=eq.${encodeURIComponent(lead.id)}&select=at,actor,action&order=at.desc&limit=50`
    );
    wyslij(res, widokKarty(lead, historia, ses));
    return;
  }

  // Licznik „czekają" liczony osobno od listy: lista jest przycięta do 100
  // wierszy i filtrowana, a liczba zaległości ma być prawdziwa niezależnie od
  // tego, czego operator akurat szuka.
  const [wiersze, czekajace] = await Promise.all([
    lista(p),
    queryLeads('status=eq.new&deleted_at=is.null&select=created_at&order=created_at.asc'),
  ]);
  wyslij(res, widokListy(wiersze, czekajace, p, ses));
}
