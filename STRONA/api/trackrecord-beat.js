// GET /api/trackrecord-beat — cotygodniowy budzik track recordu, bez zegara.
//
// Łańcuch odświeżania jest już zbudowany i działa: deploy produkcyjny wysyła
// `deployment_status`, ten uruchamia `track-record-refresh.yml`, a workflow
// podmienia plakaty na kanale. Brakowało wyłącznie czegoś, co ten deploy
// zamawia w tygodniu, w którym nic się nie zmieniło — i to robił scenariusz
// w Make.
//
// Zegara nie da się tu postawić na Vercelu: konto jest na planie Hobby, gdzie
// są DWA sloty crona na całe konto, a oba zajmuje panel (`/api/tick`
// i `/api/cron/streak-reminder`). Dlatego budzikiem jest ruch na stronie —
// ten sam wzorzec, którym panel odpala payout bota (`payoutbot_on_traffic`).
//
// Stan trzymamy w wieku SAMEGO BUILDU, nie w bazie. `public/.build-stamp`
// powstaje przy każdym budowaniu, więc po deployu licznik zeruje się sam.
// Żadnej tabeli do pilnowania i żadnego stanu, który mógłby się rozjechać
// z rzeczywistością.

const TAG = '[trackrecord-beat]';
const TYDZIEN_MS = 7 * 24 * 60 * 60 * 1000;
// Odstęp między próbami W TEJ instancji. Deploy trwa ~2 minuty, a stempel
// zmieni się dopiero po nim — bez tego okna każde wejście w tym czasie
// zamawiałoby kolejny build.
const ODSTEP_MS = 20 * 60 * 1000;

let ostatniaProba = 0;

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const hook = process.env.FXP_DEPLOY_HOOK;
  // Brak zmiennej = cisza, nie błąd. Tak samo zachowuje się ORIGIN_KEY
  // w middleware: oba systemy dają się włączać pojedynczo.
  if (!hook) {
    res.status(200).json({ ok: true, skipped: 'brak FXP_DEPLOY_HOOK' });
    return;
  }

  const teraz = Date.now();
  if (teraz - ostatniaProba < ODSTEP_MS) {
    res.status(200).json({ ok: true, skipped: 'odstep' });
    return;
  }
  ostatniaProba = teraz;

  let zbudowano = null;
  try {
    const odp = await fetch(new URL('/.build-stamp', `https://${req.headers.host}`), {
      cache: 'no-store',
    });
    if (odp.ok) zbudowano = Date.parse((await odp.text()).trim());
  } catch (e) {
    console.warn(TAG, 'nie udalo sie odczytac stempla:', e.message);
  }

  if (!zbudowano || Number.isNaN(zbudowano)) {
    // Bez stempla nie zamawiamy niczego. Zgadywanie skonczyloby sie buildem
    // przy kazdym wejsciu na strone.
    res.status(200).json({ ok: true, skipped: 'brak stempla builda' });
    return;
  }

  const wiek = teraz - zbudowano;
  if (wiek < TYDZIEN_MS) {
    res.status(200).json({ ok: true, fresh: true, ageDays: +(wiek / 86400000).toFixed(1) });
    return;
  }

  try {
    const odp = await fetch(hook, { method: 'POST' });
    console.log(TAG, 'zamowiono build, wiek poprzedniego:',
      (wiek / 86400000).toFixed(1), 'dnia, odpowiedz:', odp.status);
    // Adresu hooka nie ma w odpowiedzi ani w logu — jest sekretem, a logi
    // funkcji widzi kazdy, kto ma dostep do projektu.
    res.status(200).json({ ok: odp.ok, requested: true,
      ageDays: +(wiek / 86400000).toFixed(1) });
  } catch (e) {
    console.error(TAG, 'deploy hook nie odpowiedzial:', e.message);
    res.status(200).json({ ok: false, error: 'deploy hook nie odpowiedzial' });
  }
}
