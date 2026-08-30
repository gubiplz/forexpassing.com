// Zrzuty panelu przycięte jak u wzorca: nagłówek + statystyki + equity obok
// monthly. Reszta paneli i nota schowane — kwadratowy plakat ich nie pomieści.
const { chromium } = require('playwright');
const { PROFILES } = require('./scrape');

async function shoot() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
  await p.goto('https://forexpassing.com/past-performance', { waitUntil: 'networkidle', timeout: 60000 });
  await p.getByText('View full track record').click();
  await p.waitForSelector('.mm-tr', { timeout: 15000 });
  await p.addStyleTag({ content: `
    .mm-tr-note { display: none !important; }
    .mm-tr-grid > section:nth-child(n+3) { display: none !important; }
    .mm-tr-grid { grid-template-columns: 1fr 1fr !important; }
    .mm-tr-panel.is-wide { grid-column: auto !important; }
    .mm-tr > button, .mm-tr [class*="close"], [class*="modal"] > button { display: none !important; }
  ` });

  for (const { id, pill } of PROFILES) {
    await p.locator('.mm-tr-pill', { hasText: pill }).first().click();
    await p.waitForTimeout(700);
    await p.locator('.mm-tr').first().screenshot({ path: `shot2-${id}.png` });
    console.log('shot2', id);
  }
  await b.close();
}

if (require.main === module) {
  shoot().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { shoot };
