// GET|POST /api/site-rebuild — cotygodniowy budzik dla samej serii track record.
//
// PO CO TO ISTNIEJE. Seria rośnie w `npm run build`, bo pierwszym krokiem builda
// jest bin/roll-track-record.mjs. Skutek: między deployami panel na
// /past-performance STOI. W tygodniu bez deploya „34 weeks" zostaje „34 weeks",
// choć minął kolejny tydzień sesji. Ten endpoint zamawia deploy, deploy roluje
// dane, a jego `deployment_status` odpala .github/workflows/track-record-refresh.yml,
// czyli plakaty i podpisy na @fx_passingtrackrecord idą tym samym ruchem.
// Jeden łańcuch, jedno źródło prawdy, zero szans na rozjazd strony z postem.
//
// DLACZEGO DEPLOY HOOK, A NIE GITHUB. Odpalenie builda po stronie GitHuba
// wymagałoby PAT-a — rzeczy, która wygasa i którą trzeba pamiętać. Deploy Hook
// to URL bez terminu ważności, wystawiany w Vercelu na jeden projekt i jedną
// gałąź; nie da się nim zrobić nic poza zamówieniem builda tej gałęzi.
//
// KONFIGURACJA (dwie zmienne w projekcie na Vercelu):
//   VERCEL_DEPLOY_HOOK_URL — Settings → Git → Deploy Hooks, gałąź `main`.
//   CRON_SECRET            — dowolny długi losowy ciąg; Vercel sam dokleja go
//                            crnowym żądaniom w nagłówku Authorization.
//
// CRON_SECRET jest tu WYMAGANY, w przeciwieństwie do spots-ping. Tam najgorsze,
// co daje obcy strzał, to jedno zbędne getChat. Tutaj każde wywołanie kosztuje
// build i wchodzi w dzienny limit deployów, więc endpoint bez sekretu byłby
// darmowym przyciskiem „spal komuś minuty builda" dla całego internetu.
// Brak sekretu w środowisku = 503, nie otwarte drzwi.

const TAG = '[site-rebuild]';

// Cron chodzi raz na tydzień, więc każde dwa strzały pod rząd to albo pomyłka,
// albo ponowienie. Trzymamy je per instancja — tyle wystarcza, żeby retry
// Vercela nie zamówił drugiego builda tej samej minuty.
const THROTTLE_MS = 10 * 60_000;
let lastRunAt = 0;

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(`${TAG} brak CRON_SECRET — endpoint zamknięty`);
    res.status(503).json({ ok: false, error: 'brak CRON_SECRET w środowisku' });
    return;
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: 'brak lub zły CRON_SECRET' });
    return;
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    res.status(500).json({ ok: false, error: 'brak VERCEL_DEPLOY_HOOK_URL w środowisku' });
    return;
  }

  const now = Date.now();
  if (now - lastRunAt < THROTTLE_MS) {
    res.status(200).json({ ok: true, skipped: 'throttled' });
    return;
  }

  try {
    const r = await fetch(hook, { method: 'POST' });
    if (!r.ok) {
      const tresc = await r.text();
      console.error(`${TAG} hook odrzucił: HTTP ${r.status} ${tresc.slice(0, 200)}`);
      res.status(502).json({ ok: false, error: `deploy hook: HTTP ${r.status}` });
      return;
    }
    lastRunAt = now;
    console.log(`${TAG} build zamówiony`);
    res.status(200).json({ ok: true, requested: 'deploy' });
  } catch (err) {
    console.error(`${TAG} ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
}
