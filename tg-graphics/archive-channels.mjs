/**
 * Archiwum kanałów Telegrama z publicznego podglądu `t.me/s/<handle>`.
 *
 * Po co: kiedy konto zostało zamrożone, kanały przeżyły, ale na dysku nie było
 * kopii ANI JEDNEGO posta poza czterema z `rollback-2026-09-08/`. Ten skrypt
 * zdejmuje całą treść bez tokenu, bez konta i bez uprawnień admina — czyta
 * dokładnie to, co widzi każdy niezalogowany człowiek pod adresem kanału.
 *
 * Czego NIE zdejmie: postów z kanału prywatnego (podgląd istnieje tylko dla
 * publicznych), reakcji (podgląd ich nie renderuje) i oryginałów wideo w pełnej
 * jakości. Liczba wyświetleń i pełny tekst są, bo to widać na stronie.
 *
 *   node archive-channels.mjs                 # trzy kanały domyślne
 *   node archive-channels.mjs fx_passing      # wybrany
 *   node archive-channels.mjs --no-media      # sam tekst, bez pobierania
 *
 * Wynik: archive/<handle>/messages.json + archive/<handle>/media/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DOMYSLNE = ['fx_passing', 'fx_passingpayouts', 'fx_passingtrackrecord'];
const KATALOG = 'archive';

const args = process.argv.slice(2);
const bezMediow = args.includes('--no-media');
const wskazane = args.filter((a) => !a.startsWith('--'));
const KANALY = wskazane.length ? wskazane : DOMYSLNE;

/** t.me bez User-Agenta potrafi oddać okrojoną stronę. */
const NAGLOWKI = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};

const spij = (ms) => new Promise((r) => setTimeout(r, ms));

async function pobierz(url, { binarnie = false } = {}) {
  let ostatni;
  for (let proba = 1; proba <= 3; proba += 1) {
    try {
      const odp = await fetch(url, { headers: NAGLOWKI });
      if (!odp.ok) throw new Error(`HTTP ${odp.status}`);
      return binarnie ? Buffer.from(await odp.arrayBuffer()) : await odp.text();
    } catch (e) {
      ostatni = e;
      if (proba < 3) await spij(proba * 1500);
    }
  }
  throw ostatni;
}

/** Encje i znaczniki, które faktycznie występują w podglądzie. */
function odkoduj(s) {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Podgląd renderuje każdy post jako `<div class="tgme_widget_message ..."
 * data-post="handle/ID">`. Tniemy po tym znaczniku zamiast parsować cały
 * dokument — struktura wokół zmienia się częściej niż ten atrybut.
 */
function rozbierz(html, handle) {
  const posty = [];

  for (const kawalek of html.split(/(?=<div class="tgme_widget_message[ "])/)) {
    const mId = kawalek.match(/data-post="[^/"]+\/(\d+)"/);
    if (!mId) continue;

    const mData = kawalek.match(/<time[^>]+datetime="([^"]+)"/);
    const mTekst = kawalek.match(/js-message_text[^>]*>([\s\S]*?)<\/div>/);
    const mWyswietlenia = kawalek.match(/tgme_widget_message_views[^>]*>([^<]*)</);
    const mServis = kawalek.match(/tgme_widget_message_service[^>]*>([\s\S]*?)<\/div>/);

    // Zdjęcia siedzą w stylu inline jako background-image; emoji i awatary nie.
    const zdjecia = [...kawalek.matchAll(/background-image:\s*url\('([^']+)'\)/g)]
      .map((m) => m[1])
      .filter((u) => !u.includes('emoji') && !u.includes('/i/userpic/'));

    const wideo = [...kawalek.matchAll(/<video[^>]+src="([^"]+)"/g)].map((m) => m[1]);

    posty.push({
      id: Number(mId[1]),
      url: `https://t.me/${handle}/${mId[1]}`,
      date: mData ? mData[1] : null,
      text: mTekst ? odkoduj(mTekst[1]).trim() : '',
      service: mServis ? odkoduj(mServis[1]).trim() : null,
      views: mWyswietlenia ? mWyswietlenia[1].trim() : null,
      photos: [...new Set(zdjecia)],
      videos: [...new Set(wideo)],
      media: [],
    });
  }
  return posty;
}

async function archiwizuj(handle) {
  const kat = path.join(KATALOG, handle);
  const katMediow = path.join(kat, 'media');
  await mkdir(katMediow, { recursive: true });

  const zebrane = new Map();
  let przed = null;
  let bezNowych = 0;

  // Podgląd oddaje ~20 postów na stronę; `?before=` cofa się w czasie.
  for (let runda = 0; runda < 60; runda += 1) {
    const url = przed
      ? `https://t.me/s/${handle}?before=${przed}`
      : `https://t.me/s/${handle}`;
    const posty = rozbierz(await pobierz(url), handle);

    const nowe = posty.filter((p) => !zebrane.has(p.id)).length;
    for (const p of posty) if (!zebrane.has(p.id)) zebrane.set(p.id, p);
    process.stdout.write(`  +${nowe} (razem ${zebrane.size})\n`);

    if (nowe === 0) {
      bezNowych += 1;
      if (bezNowych >= 2) break;
    } else {
      bezNowych = 0;
    }
    if (!posty.length) break;

    const najmniejsze = Math.min(...posty.map((p) => p.id));
    if (przed !== null && najmniejsze >= przed) break;
    przed = najmniejsze;
    if (najmniejsze <= 1) break;

    await spij(700); // nie młócimy t.me
  }

  const posty = [...zebrane.values()].sort((a, b) => a.id - b.id);

  if (!bezMediow) {
    for (const p of posty) {
      for (const [i, src] of [...p.photos, ...p.videos].entries()) {
        const nazwa = `${p.id}${i ? `-${i}` : ''}.${src.includes('.mp4') ? 'mp4' : 'jpg'}`;
        const cel = path.join(katMediow, nazwa);
        if (existsSync(cel)) {
          p.media.push(nazwa);
          continue;
        }
        try {
          await writeFile(cel, await pobierz(src, { binarnie: true }));
          p.media.push(nazwa);
          await spij(250);
        } catch (e) {
          process.stdout.write(`    ! media ${p.id}: ${e.message}\n`);
        }
      }
    }
  }

  const plik = path.join(kat, 'messages.json');
  const tresc = { handle, archivedAt: new Date().toISOString(), count: posty.length, posts: posty };
  await writeFile(plik, `${JSON.stringify(tresc, null, 2)}\n`);

  const zMediami = posty.filter((p) => p.media.length).length;
  process.stdout.write(`  zapisano ${posty.length} postów (${zMediami} z mediami) → ${plik}\n\n`);
  return posty.length;
}

let razem = 0;
for (const h of KANALY) {
  process.stdout.write(`== ${h} ==\n`);
  try {
    razem += await archiwizuj(h);
  } catch (e) {
    process.stdout.write(`  BŁĄD: ${e.message}\n\n`);
    process.exitCode = 1;
  }
}
process.stdout.write(`Gotowe: ${razem} postów w ${KATALOG}/\n`);
