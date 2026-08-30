// GET /api/track-refresh — budzik dla odświeżania postów track record.
//
// Sam nic nie renderuje: plakaty powstają w Playwrighcie, a ten nie mieści się
// w funkcji serverless. Ten endpoint tylko robi workflow_dispatch na
// .github/workflows/track-record-refresh.yml i tam dzieje się reszta.
//
// Dlaczego akurat tak: harmonogram GitHub Actions na tym repo NIE DZIAŁA (patrz
// nagłówek telegram-spots.yml), a `workflow_dispatch` i cron Vercela działają
// oba. Więc pod harmonogram bierzemy to, co chodzi, i doklejamy do tego, co
// potrafi odpalić przeglądarkę.
//
// Wymaga zmiennej GH_DISPATCH_TOKEN — fine-grained PAT do TEGO repo z
// uprawnieniem Actions: Read and write. Bez niej endpoint zwraca 500 i nic
// nie odpala.
//
// CRON_SECRET jest opcjonalny: gdy jest ustawiony, Vercel dokleja go crnowym
// żądaniom w nagłówku Authorization i wtedy go egzekwujemy. Bez niego endpoint
// jest otwarty, ale najgorsze, co da się nim zrobić, to wywołać przebieg, który
// wyliczy to samo i nie zmieni ani jednego posta.

const TAG = '[track-refresh]';
const REPO = 'gubiplz/forexpassing.com';
const WORKFLOW = 'track-record-refresh.yml';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: 'brak lub zły CRON_SECRET' });
    return;
  }

  const ghToken = process.env.GH_DISPATCH_TOKEN;
  if (!ghToken) {
    res.status(500).json({ ok: false, error: 'brak GH_DISPATCH_TOKEN w środowisku' });
    return;
  }

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ghToken}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
        'user-agent': 'forexpassing-track-refresh',
      },
      // `inputs` idzie tylko wtedy, gdy naprawdę o coś prosimy. GitHub bywa
      // wybredny o typy przy dispatchu z API, a domyślne wartości z workflow
      // załatwiają zwykły przebieg bez podawania czegokolwiek.
      body: JSON.stringify(req.query?.dry ? { ref: 'main', inputs: { dry: 'true' } } : { ref: 'main' }),
    });

    // GitHub kwituje dispatch pustym 204 — brak ciała to sukces, nie awaria.
    if (r.status !== 204) {
      const tresc = await r.text();
      console.error(`${TAG} dispatch odrzucony: HTTP ${r.status} ${tresc.slice(0, 300)}`);
      res.status(502).json({ ok: false, error: `github: HTTP ${r.status}`, detail: tresc.slice(0, 300) });
      return;
    }

    console.log(`${TAG} workflow ${WORKFLOW} odpalony`);
    res.status(200).json({ ok: true, dispatched: WORKFLOW, repo: REPO });
  } catch (err) {
    console.error(`${TAG} ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
}
