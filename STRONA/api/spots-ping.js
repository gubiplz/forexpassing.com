// GET /api/spots-ping — publiczny, throttlowany trigger syncu opisu kanału.
//
// Wołany z /thank-you (fire-and-forget przy wejściu i przy każdym przeskoku
// licznika) oraz z crona Vercela co 30 minut. Bez sekretu: idempotentny
// (zapis tylko gdy liczba się różni) i ograniczony in-memory do ~1 wywołania
// Telegrama na minutę na instancję funkcji — flood z botów nie pali API.
//
// Dlaczego co 30 minut, a nie punktualnie na siedmiu progach licznika: te progi
// wynikają z SPOTS_START/SPOTS_END/SPOTS_STEP w src/lib/spots.js, a cron zna
// tylko UTC. Wpisanie ich do vercel.json wymagałoby czternastu linii (siedem na
// czas letni, siedem na zimowy) i przeniosłoby wzór w miejsce, którego nic nie
// testuje — po zmianie SPOTS_START crony po cichu wskazywałyby nie te godziny.
// Ślepe pytanie co pół godziny kosztuje jedno getChat i nie ma czego rozjechać.
//
// Zapisana logika: api/_lib/spots-sync-core.js (ta sama co w spots-sync).

import { syncChannelDescription } from './_lib/spots-sync-core.js';

const TAG = '[spots-ping]';
const THROTTLE_MS = 60_000;

// Per-instance (wystarcza na serverless: cold start resetuje, warm trzyma).
let lastRunAt = 0;
let lastResult = null;

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  // CORS niepotrzebny — to samo origin z thank-you; cron też bije bezpośrednio.

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: 'brak TELEGRAM_BOT_TOKEN w środowisku' });
    return;
  }

  const now = Date.now();
  if (now - lastRunAt < THROTTLE_MS && lastResult) {
    res.status(200).json({ ...lastResult, throttled: true });
    return;
  }

  try {
    const result = await syncChannelDescription({ token, now });
    lastRunAt = now;
    lastResult = result;
    if (result.changed) console.log(`${TAG} ${result.n} miejsc — opis zaktualizowany`);
    res.status(200).json(result);
  } catch (err) {
    console.error(`${TAG} ${err.message}`);
    res.status(err.status === 403 || err.status === 400 ? 502 : 500).json({
      ok: false,
      error: err.message,
    });
  }
}
