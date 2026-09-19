/**
 * Renderuje grafiki postow na kanal ACCOUNT MANAGEMENT.
 *
 *   node posts/render-posts.mjs            # wszystkie
 *   node posts/render-posts.mjs am-02      # wybrane
 *
 * Wyjscie: posts/out/am-NN.png (1080x1080) + posts/out/contact-sheet.png.
 *
 * Renderuje Chromium, nie biblioteka do obrazkow — dokladnie jak render2.js
 * obok. Powod jest ten sam: uklad opisany CSS-em da sie poprawic w jednym
 * miejscu, a uklad liczony w pikselach trzeba przeliczac przy kazdej zmianie
 * dlugosci tekstu.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TU = dirname(fileURLToPath(import.meta.url));
const ASSETY = resolve(TU, 'assets');
const FONTY = resolve(TU, '../../STRONA/public/fonts');
const WY = resolve(TU, 'out');

const LIMIT_PODPISU = 1024;   // tyle przepuszcza contentbot.waliduj

const spec = JSON.parse(readFileSync(resolve(TU, 'posts.json'), 'utf8'));
const szablon = readFileSync(resolve(TU, 'template-post.html'), 'utf8');

/** Escapowanie dla Telegrama: parse_mode=HTML zna tylko te trzy encje. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Podpis tak, jak zobaczy go Telegram — z linkiem i stopka. */
function podpis(post) {
  const stopka =
    '\n\n👉 <a href="https://t.me/forex_passing_admin">Click here to send us a message</a>' +
    '\n\n❕ Official channel. Our only admin is @forex_passing_admin — anyone else is a scam.';
  return esc(post.body) + stopka;
}

const ptak = `<svg class="znak" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#2fae6a"/><path d="M7 12.4l3.2 3.2L17 9" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const krzyz = `<svg class="znak" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.6" stroke="#b9c4bd" stroke-width="2.2"/><path d="M8 16L16 8" stroke="#b9c4bd" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/** Obrazek, ktorego jeszcze nie ma, renderuje sie jako zaslepka — uklad da
 *  sie ocenic zanim dojda portrety. */
function obrazek(nazwa, klasa, opisPustego) {
  const sciezka = nazwa ? resolve(ASSETY, nazwa) : null;
  if (sciezka && existsSync(sciezka)) {
    return `<img class="${klasa}" src="file://${sciezka}" alt="">`;
  }
  return `<div class="${klasa} pusty">${opisPustego}</div>`;
}

const BLOKI = {
  steps: (p) => p.kroki.map((k, i) => `
    <div class="karta krok${k.akcent ? ' akcent' : ''}">
      <div class="nr">${i + 1}</div>
      <div><div class="tyt">${k.tyt}</div><div class="opis">${k.opis}</div></div>
    </div>`).join(''),

  compare: (p) => `
    <div class="grupa zla"><div class="etykieta">${p.zla_etykieta}</div>
      <div class="karta">${p.zle.map((t) => `<li>${krzyz}<span>${t}</span></li>`).join('')}</div>
    </div>
    <div class="grupa dobra"><div class="etykieta">${p.dobra_etykieta}</div>
      <div class="karta akcent">${p.dobre.map((t) => `<li>${ptak}<span>${t}</span></li>`).join('')}</div>
    </div>`,

  portrait: (p) => `
    ${obrazek(`faces/${p.twarz}`, 'portret', 'portret<br>w drodze')}
    <div class="opowiesc">${p.akapity.map((t) => `<p>${t}</p>`).join('')}</div>`,

  phone: (p) => `
    <div class="telefon">
      <div class="wciecie"></div>
      <div class="ekran"><div class="zegar">10:09</div></div>
      <div class="powiadomienia">
        ${p.powiadomienia.map((n) => `
          <div class="pow">
            <img src="file://${resolve(ASSETY, 'logo.png')}" alt="">
            <div><div class="tytul">${n.tytul}</div><div class="tekst">${n.tekst}</div></div>
            <div class="kiedy">${n.kiedy}</div>
          </div>`).join('')}
      </div>
    </div>`,

  stat: (p) => `
    <div class="karta liczba">
      <div class="duza">${p.duza}</div>
      <div class="pod">${p.pod}</div>
    </div>
    <div class="paski">
      ${p.pola.map((f) => `<div class="karta pole"><div class="w">${f.w}</div><div class="e">${f.e}</div></div>`).join('')}
    </div>`,

  cert: (p) => `
    ${obrazek(p.cert, 'cert-obraz', 'certyfikat<br>w drodze')}
    <div class="wyplata">
      <div class="ikona">⏳</div>
      <div class="tyt">${p.wyplata.tyt}</div>
      <div class="kwota">${p.wyplata.kwota}</div>
      <div class="nota">You will receive an email once the withdrawal is completed.</div>
      <div class="przycisk">View History</div>
    </div>`,
};

function zbudujHtml(post) {
  const blok = BLOKI[post.wariant];
  if (!blok) throw new Error(`${post.id}: nieznany wariant "${post.wariant}"`);
  return szablon
    .replaceAll('__FONTY__', `file://${FONTY}`)
    .replaceAll('__ASSETY__', `file://${ASSETY}`)
    .replace('__KLASA_NAGLOWKA__', post.l1 ? '' : 'solo')
    .replace('__LINIA1__', post.l1 ? `<div class="l1">${post.l1}</div>` : '')
    .replace('__LINIA2__', post.l2)
    .replace('__TRESC__', blok(post))
    .replace('__CTA__', post.cta || spec.cta_domyslne)
    .replace('<div class="poster">', `<div class="poster v-${post.wariant}">`);
}

const tylko = process.argv.slice(2);
const posty = tylko.length ? spec.posty.filter((p) => tylko.includes(p.id)) : spec.posty;
if (!posty.length) throw new Error(`nie znalazlem postow: ${tylko.join(', ')}`);

mkdirSync(WY, { recursive: true });

// Podpisy sprawdzam PRZED renderem. Grafika do posta, ktory i tak odbije sie
// od walidatora kolejki, to zmarnowany przebieg i zmarnowany przeglad.
const zaDlugie = spec.posty
  .map((p) => [p.id, podpis(p).length])
  .filter(([, n]) => n > LIMIT_PODPISU);
if (zaDlugie.length) {
  for (const [id, n] of zaDlugie) console.error(`  ${id}: podpis ma ${n} znakow, limit ${LIMIT_PODPISU}`);
  throw new Error('skroc podpisy — Telegram odetnie je w polowie zdania');
}

const b = await chromium.launch();
const strona = await b.newPage({ viewport: { width: 1120, height: 1120 }, deviceScaleFactor: 1 });

for (const post of posty) {
  const html = zbudujHtml(post);
  const plik = resolve(WY, `${post.id}.html`);
  writeFileSync(plik, html);
  await strona.goto(`file://${plik}`);

  // Bez tego Chromium lapie fallback zamiast Antona — udokumentowana
  // pulapka render2.js obok.
  await strona.evaluate(() => document.fonts.ready);
  const anton = await strona.evaluate(() => document.fonts.check('112px Anton'));
  if (!anton) throw new Error(`${post.id}: Anton sie nie zaladowal`);
  await strona.waitForTimeout(220);

  // Blok tresci jest elastyczny, wiec za dlugi tekst nie rozciaga plakatu —
  // wychodzi POD naglowek i POD pigulke, co na zrzucie wyglada jak nachodzace
  // na siebie warstwy. Lapiemy to pomiarem, bo na malym podgladzie umyka.
  const przelew = await strona.evaluate(() => {
    const t = document.querySelector('.tresc');
    return { ma: t.scrollHeight, miejsce: t.clientHeight };
  });
  if (przelew.ma > przelew.miejsce + 1) {
    throw new Error(`${post.id}: tresc nie miesci sie w kadrze `
      + `(${przelew.ma} px przy ${przelew.miejsce} px) — skroc ja albo zmniejsz krok`);
  }

  await strona.locator('.poster').screenshot({ path: resolve(WY, `${post.id}.png`) });
  console.log(`  ${post.id}  ${post.wariant.padEnd(9)} podpis ${String(podpis(post).length).padStart(4)}/1024`);
}

// Arkusz kontaktowy: wszystkie grafiki naraz, z numerami — zeby poprawki
// dalo sie zglosic numerem, a nie opisem.
const kafle = spec.posty.map((p) => `
  <figure><img src="file://${resolve(WY, `${p.id}.png`)}"><figcaption>${p.id} · ${p.wariant}</figcaption></figure>`).join('');
const arkusz = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#1b1f1d;padding:26px;font:600 20px/1.3 system-ui;color:#d8e6de}
  .siatka{display:grid;grid-template-columns:repeat(2,540px);gap:22px}
  figure{margin:0}img{width:540px;display:block;border-radius:10px}
  figcaption{padding:8px 2px 0;font-size:19px;color:#8fb0a0}
</style><div class="siatka">${kafle}</div>`;
const plikArkusza = resolve(WY, 'contact-sheet.html');
writeFileSync(plikArkusza, arkusz);
await strona.setViewportSize({ width: 1160, height: 400 });
await strona.goto(`file://${plikArkusza}`);
await strona.waitForTimeout(300);
await strona.screenshot({ path: resolve(WY, 'contact-sheet.png'), fullPage: true });

await b.close();
console.log(`\ngotowe → ${WY}`);
