// Opis kanału track record składany z tych samych liczb, co plakaty.
//
// Po co: plakat widzi ten, kto przewinie do posta, a opis czyta KAŻDY, kto
// wejdzie na kanał pierwszy raz — i dotąd stało tam coś napisanego ręcznie
// kiedyś tam. Skoro liczby i tak przeliczają się przy każdym odświeżeniu,
// opis nie ma powodu zostawać w tyle.
//
// Wzorzec z `STRONA/api/_lib/spots-sync-core.js`: przeczytaj, złóż, zapisz,
// przeczytaj ponownie. Odczyt weryfikacyjny nie jest ostrożnością na wyrost —
// `setChatDescription` potrafi zwrócić `ok:true` i nie zmienić nic, gdy bot ma
// prawo publikowania, ale nie ma prawa zmiany informacji o kanale.
//
// Limit Telegrama to 255 znaków i jest twardy: dłuższy opis jest ODRZUCANY
// w całości, nie przycinany.
const { readFileSync } = require('node:fs');

const TOKEN = process.env.TG_TOKEN;
const CHAT = process.env.TG_CHAT || '@fx_passingtrackrecord';
const LIMIT = 255;

// Profil, z którego bierzemy liczby do opisu. `balanced` jest ustawieniem
// domyślnym usługi, więc opis kanału ma mówić o tym, co dostaje większość.
const PROFIL = 'balanced';

function sprawdz(warunek, opis) {
  if (!warunek) throw new Error(opis);
}

/**
 * Składa opis z danych. Wydzielone, żeby dało się sprawdzić bez sieci.
 * @param {Record<string, any>} profiles
 * @returns {string}
 */
function buildDescription(profiles) {
  const p = profiles?.[PROFIL];
  sprawdz(p, `brak profilu "${PROFIL}" w danych`);
  for (const pole of ['weeks', 'trades', 'winRate', 'profitFactor', 'maxDrawdown', 'totalReturn']) {
    sprawdz(p[pole] !== undefined && p[pole] !== null && p[pole] !== '',
      `brak pola "${pole}" w profilu ${PROFIL}`);
  }

  const opis = [
    `Verified track record — Balanced profile, ${p.weeks} weeks live.`,
    `${p.totalReturn} total · ${p.winRate} win rate · PF ${p.profitFactor} · max DD ${p.maxDrawdown} · ${p.trades} trades.`,
    'Full breakdown: forexpassing.com/past-performance',
  ].join('\n');

  // Odmowa, nie przycięcie: obcięty opis potrafi znaczyć co innego niż cały,
  // a przy liczbach „max DD 3.7" zamiast „3.76%" to już inna informacja.
  sprawdz(opis.length <= LIMIT,
    `opis ma ${opis.length} znaków, a limit Telegrama to ${LIMIT}`);
  return opis;
}

async function tg(metoda, parametry) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${metoda}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parametry),
  });
  const dane = await res.json().catch(() => ({}));
  // Token siedzi w URL-u, więc do błędu NIGDY nie trafia adres żądania —
  // logi Actions tego repo są publiczne.
  if (!dane.ok) throw new Error(`${metoda}: ${dane.description || `HTTP ${res.status}`}`);
  return dane.result;
}

/**
 * @param {{ dry?: boolean }} opcje
 * @returns {Promise<{ zmieniony: boolean, dlugosc: number }>}
 */
async function describe({ dry = false } = {}) {
  const dane = JSON.parse(readFileSync(`${__dirname}/track-data.json`, 'utf8'));
  const opis = buildDescription(dane.profiles);

  if (dry) {
    console.log(`[dry] opis ${opis.length}/${LIMIT} zn.:\n${opis}`);
    return { zmieniony: false, dlugosc: opis.length };
  }
  sprawdz(TOKEN, 'brak TG_TOKEN w środowisku');

  const przed = await tg('getChat', { chat_id: CHAT });
  if ((przed.description || '') === opis) {
    console.log('opis bez zmian');
    return { zmieniony: false, dlugosc: opis.length };
  }

  await tg('setChatDescription', { chat_id: CHAT, description: opis });

  const po = await tg('getChat', { chat_id: CHAT });
  sprawdz((po.description || '') === opis,
    'Telegram przyjął żądanie, ale opis się nie zmienił — bot najpewniej nie ma '
    + 'prawa „zmiana informacji" na tym kanale');

  console.log(`opis zaktualizowany (${opis.length}/${LIMIT} zn.)`);
  return { zmieniony: true, dlugosc: opis.length };
}

module.exports = { describe, buildDescription, LIMIT };

if (require.main === module) {
  describe({ dry: process.argv.includes('--dry') })
    .catch((e) => { console.error('BŁĄD:', e.message); process.exit(1); });
}
