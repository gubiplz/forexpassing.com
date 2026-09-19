// Przywraca posty 7–10 z katalogu rollback-YYYY-MM-DD (caption + jpg z t.me).
const { readFileSync, existsSync } = require('node:fs');
const dir = process.argv[2] || `${__dirname}/rollback-2026-09-08`;
const TOKEN = process.env.TG_TOKEN;
const CHAT = process.env.TG_CHAT || '@fx_passingtrackrecord';
const MAP = { low: 7, balanced: 8, scaling: 9, high: 10 };
if (!TOKEN) throw new Error('brak TG_TOKEN');
(async () => {
  for (const [id, messageId] of Object.entries(MAP)) {
    const caption = readFileSync(`${dir}/caption-${id}.txt`, 'utf8');
    const jpg = `${dir}/post-${messageId}.jpg`;
    const png = `${dir}/poster2-${id}.png`;
    const file = existsSync(png) ? png : jpg;
    const form = new FormData();
    form.set('chat_id', CHAT);
    form.set('message_id', String(messageId));
    form.set('media', JSON.stringify({ type: 'photo', media: 'attach://photo', caption }));
    form.set('photo', new Blob([readFileSync(file)], { type: file.endsWith('.png') ? 'image/png' : 'image/jpeg' }), `${id}.jpg`);
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageMedia`, { method: 'POST', body: form });
    const body = await res.json();
    if (!body.ok) throw new Error(`${id}: ${body.description}`);
    console.log(id, 'restored msg', messageId, 'from', file);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
