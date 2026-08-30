// Wysyła plakaty z podpisami botem na kanał payouts. Liczby w podpisach są
// zeskrobane z żywej strony — te same, które widać na zrzutach w plakatach.
//
// To narzędzie do PIERWSZEJ publikacji. Odświeżanie już opublikowanych postów
// robi edit.js: nowy post traci wyświetlenia i reakcje, których nie da się
// przenieść.
const { readFileSync } = require('node:fs');
const { buildCaptions, ORDER } = require('./captions');

const TOKEN = process.env.TG_TOKEN;
const CHAT = process.env.TG_CHAT || '-1004435320621';

(async () => {
  const dane = JSON.parse(readFileSync(`${__dirname}/track-data.json`, 'utf8'));
  const captions = buildCaptions(dane.profiles);
  if (!TOKEN) throw new Error('brak TG_TOKEN w środowisku');

  for (const id of ORDER) {
    const caption = captions[id];
    const form = new FormData();
    form.set('chat_id', CHAT);
    form.set('caption', caption);
    form.set('photo', new Blob([readFileSync(`poster2-${id}.png`)], { type: 'image/png' }), `${id}.png`);
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { method: 'POST', body: form });
    const body = await res.json();
    if (!body.ok) throw new Error(`${id}: ${body.description}`);
    console.log(id, 'OK id', body.result.message_id, `(caption ${caption.length} zn.)`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
