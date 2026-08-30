// Plakaty v2: kwadrat 1:1, bez ramki, kolor akcentu tytułu per profil.
const { chromium } = require('playwright');
const { readFileSync, writeFileSync } = require('node:fs');

const POSTERS = [
  { id: 'low', title: '<span class="accent">Low risk</span> settings', accent: '#131f18' },
  { id: 'balanced', title: '<span class="accent">Balanced</span> settings', accent: '#eda806' },
  { id: 'scaling', title: '<span class="accent">Scaling</span> route', accent: '#12a35e' },
  { id: 'high', title: '<span class="accent">High</span> risk settings', accent: '#e5484d' },
];

async function render() {
  const tpl = readFileSync(`${__dirname}/template2.html`, 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1120, height: 1120 }, deviceScaleFactor: 1 });
  for (const { id, title, accent } of POSTERS) {
    const html = tpl
      .replace('__TITLE__', title)
      .replace('__ACCENT__', accent)
      .replace('__SHOT__', `shot2-${id}.png`);
    writeFileSync(`poster2-${id}.html`, html);
    await p.goto(`file://${process.cwd()}/poster2-${id}.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.locator('.poster').screenshot({ path: `poster2-${id}.png` });
    console.log('poster2', id);
  }
  await b.close();
}

if (require.main === module) {
  render().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { render, POSTERS };
