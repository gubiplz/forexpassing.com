// Zbiera z żywego panelu dokładnie te liczby, które widać na zrzutach —
// podpis pod grafiką nie ma prawa różnić się od niej o jeden dzień danych.
//
// Wynik ląduje w track-data.json, z którego captions.js składa podpisy.
// Oddzielny przebieg przeglądarki niż zrzuty w shoot2.js, bo tam DOM jest
// przycinany stylami pod kwadratowy plakat — czytanie liczb z okrojonego widoku
// prosiło się o pomyłkę. Rozjazd grozi więc tylko wtedy, gdy strona zostanie
// przedeployowana między jednym krokiem a drugim; refresh.js puszcza oba pod
// rząd, żeby to okno liczyć w sekundach.
const { chromium } = require('playwright');
const { writeFileSync } = require('node:fs');

const PROFILES = [
  { id: 'low', pill: 'Low risk' },
  { id: 'balanced', pill: 'Balanced' },
  { id: 'scaling', pill: 'Scaling route' },
  { id: 'high', pill: 'High risk' },
];

/** „$-1,279" z panelu czyta się jak literówka; ludzie piszą „-$1,279". */
function kwota(s) {
  const m = /^\$(-?)([\d,]+)$/.exec((s || '').trim());
  return m ? `${m[1]}$${m[2]}` : (s || '').trim();
}

/** Panel pisze „97 / 100" (punktacja) i „1 : 1.03" (stosunek) — z pierwszego
 *  znaczenie niesie liczba przed ukośnikiem, z drugiego ta po dwukropku. */
function pierwszaLiczba(s) {
  const m = (s || '').match(/-?[\d.]+/);
  return m ? Number(m[0]) : null;
}

function ostatniaLiczba(s) {
  const m = (s || '').match(/-?[\d.]+/g);
  return m ? Number(m[m.length - 1]) : null;
}

async function zbierz(page) {
  return page.evaluate(() => {
    const txt = (el) => (el?.textContent || '').trim();
    const root = document.querySelector('.mm-tr');
    const stats = {};
    for (const box of root.querySelectorAll('.mm-tr-stat')) {
      stats[txt(box.querySelector('.mm-tr-stat-k'))] = txt(box.querySelector('.mm-tr-stat-v'));
    }
    const defs = {};
    const dl = root.querySelectorAll('.mm-tr-defs dt, .mm-tr-defs dd');
    for (let i = 0; i < dl.length; i += 2) defs[txt(dl[i])] = txt(dl[i + 1]);
    const months = [...root.querySelectorAll('.mm-tr-month')].map((m) => ({
      k: txt(m.querySelector('.mm-tr-month-k')),
      v: Number(txt(m.querySelector('.mm-tr-month-v')).replace('%', '')),
    }));
    return {
      total: txt(root.querySelector('.mm-tr-box-v')),
      muted: txt(root.querySelector('.mm-tr-pill.is-muted')),
      head: txt(root.querySelector('.mm-tr-head')),
      stats, defs, months,
    };
  });
}

async function scrape() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1600 } });
  await p.goto('https://forexpassing.com/past-performance', { waitUntil: 'networkidle', timeout: 60000 });
  await p.getByText('View full track record').click();
  await p.waitForSelector('.mm-tr', { timeout: 15000 });

  const out = {};
  for (const { id, pill } of PROFILES) {
    await p.locator('.mm-tr-pill', { hasText: pill }).first().click();
    await p.waitForTimeout(500);
    const r = await zbierz(p);

    const okres = /(\d+)\s*weeks\s*·\s*(\d+)\s*trades/.exec(r.muted);
    const total = /Total return\s*([+-][\d.]+%)/.exec(r.head);
    if (!okres) throw new Error(`${id}: nie odczytano tygodni i transakcji z "${r.muted}"`);
    if (!total) throw new Error(`${id}: nie odczytano całkowitego zwrotu z "${r.head}"`);

    out[id] = {
      weeks: Number(okres[1]),
      trades: Number(okres[2]),
      winRate: r.stats['Win rate'],
      profitFactor: r.stats['Profit factor'],
      maxDrawdown: r.stats['Max drawdown'],
      avgMonthly: r.stats['Avg monthly'],
      totalReturn: total[1],
      consistency: pierwszaLiczba(r.defs['Consistency']),
      riskReward: ostatniaLiczba(r.defs['Avg risk : reward']),
      bestTrade: kwota(r.defs['Best trade']),
      worstTrade: kwota(r.defs['Worst trade']),
      months: r.months,
    };

    for (const [k, v] of Object.entries(out[id])) {
      if (v === undefined || v === null || v === '') throw new Error(`${id}: brak wartości "${k}"`);
    }
    console.log(id, `${out[id].weeks} tyg · ${out[id].trades} tr · ${out[id].totalReturn}`);
  }
  await b.close();
  return { scrapedAt: new Date().toISOString(), profiles: out };
}

if (require.main === module) {
  scrape()
    .then((d) => {
      writeFileSync('track-data.json', JSON.stringify(d, null, 2));
      console.log('zapisano track-data.json');
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { scrape, PROFILES };
