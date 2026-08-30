// Cały cykl odświeżenia kanału track record jednym poleceniem:
// scrape → shoot → render → edit. To jest wejście dla harmonogramu.
//
// Kolejność nie jest dowolna. Zrzuty idą zaraz po odczycie liczb, żeby plakat i
// podpis pochodziły z tego samego stanu strony, a edycja dopiero na końcu —
// gdy oba pliki już leżą na dysku. Wywrotka na którymkolwiek kroku zostawia
// kanał nietknięty, bo do Telegrama piszemy dopiero w ostatnim.
//
// Użycie:
//   TG_TOKEN=... node refresh.js          pełny przebieg
//   node refresh.js --dry                 wszystko poza zapisem do Telegrama
const { writeFileSync } = require('node:fs');
const { scrape } = require('./scrape');
const { shoot } = require('./shoot2');
const { render } = require('./render2');
const { edit } = require('./edit');

const DRY = process.argv.includes('--dry');

(async () => {
  const start = Date.now();

  console.log('== scrape ==');
  const dane = await scrape();
  writeFileSync(`${__dirname}/track-data.json`, JSON.stringify(dane, null, 2));

  console.log('== shoot ==');
  await shoot();

  console.log('== render ==');
  await render();

  console.log('== edit ==');
  const { zmienione, pominiete } = await edit({ dry: DRY });

  const sek = Math.round((Date.now() - start) / 1000);
  console.log(`\ngotowe w ${sek}s — zmienionych ${zmienione}, bez zmian ${pominiete}${DRY ? ' (dry)' : ''}`);
})().catch((e) => { console.error('BŁĄD:', e.message); process.exit(1); });
