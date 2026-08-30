// Podmienia grafikę i podpis w JUŻ opublikowanych postach zamiast wysyłać nowe.
// Post zachowuje swoje ID, a więc wyświetlenia i reakcje — a te na kanale track
// record zbierały się tygodniami i nie ma ich jak odtworzyć.
//
// MESSAGES mapuje profil na konkretny post; kolejność jest ta z publikacji
// 2026-08-20 i nie wolno jej zgadywać przy kolejnym uruchomieniu.
const { readFileSync } = require('node:fs');
const { buildCaptions } = require('./captions');

const TOKEN = process.env.TG_TOKEN;
const CHAT = process.env.TG_CHAT || '@fx_passingtrackrecord';

const MESSAGES = { low: 7, balanced: 8, scaling: 9, high: 10 };

/**
 * @param {{ dry?: boolean }} opcje
 * @returns {Promise<{ zmienione: number, pominiete: number }>}
 */
async function edit({ dry = false } = {}) {
  const dane = JSON.parse(readFileSync(`${__dirname}/track-data.json`, 'utf8'));
  const captions = buildCaptions(dane.profiles);
  if (!dry && !TOKEN) throw new Error('brak TG_TOKEN w środowisku');

  let zmienione = 0;
  let pominiete = 0;
  for (const [id, messageId] of Object.entries(MESSAGES)) {
    const caption = captions[id];
    const plik = `poster2-${id}.png`;
    if (dry) {
      console.log(`[dry] ${id} -> msg ${messageId}, ${plik}, caption ${caption.length} zn.`);
      continue;
    }
    const form = new FormData();
    form.set('chat_id', CHAT);
    form.set('message_id', String(messageId));
    // Plik leci osobnym polem, a media wskazuje na nie przez attach:// — inaczej
    // Telegram przyjąłby tylko file_id albo URL, czyli starą grafikę.
    form.set('media', JSON.stringify({ type: 'photo', media: 'attach://photo', caption }));
    form.set('photo', new Blob([readFileSync(plik)], { type: 'image/png' }), `${id}.png`);
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageMedia`, { method: 'POST', body: form });
    const body = await res.json();
    // Nic się nie zmieniło od ostatniego przebiegu — przy cotygodniowym
    // odświeżaniu to normalny wynik, nie awaria, więc nie wywracamy całości.
    if (!body.ok && /message is not modified/i.test(body.description || '')) {
      console.log(id, 'bez zmian');
      pominiete += 1;
      continue;
    }
    if (!body.ok) throw new Error(`${id} (msg ${messageId}): ${body.description}`);
    console.log(id, 'OK msg', body.result.message_id, `(caption ${caption.length} zn.)`);
    zmienione += 1;
  }
  return { zmienione, pominiete };
}

if (require.main === module) {
  edit({ dry: process.argv.includes('--dry') })
    .catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { edit, MESSAGES };
