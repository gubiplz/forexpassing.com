// /api/pay/<token> — zamówienie prop firmy, czytane z naszego serwera.
//
// Klient dogadał zakup na Telegramie i dostał JEDEN link. Ma go otworzyć u nas,
// zobaczyć naszą stronę i zapłacić bez skakania po domenach w połowie zakupu.
// Kasę prowadzi prop firma (PARTNER_FIRM w src/constants.ts) — to jej nazwa
// będzie na wyciągu z karty i strona mówi to wprost, zanim ktokolwiek kliknie.
//
// Ta funkcja jest tu po to, żeby sekret został po stronie serwera. Gdyby
// przeglądarka pytała prop firmę bezpośrednio, token integracji musiałby
// pojechać do klienta razem z bundlem.
//
//   GET  → pozycja, kwota, numer, status i — gdy zamówienie dostało zniżkę
//          partnerską — cena sprzed niej (bez danych osobowych: tyle oddaje
//          tamta strona i tyle nam wystarcza do narysowania kwoty)
//   POST → adres kasy; przekierowanie robi już przeglądarka
//
// Dwie zmienne środowiskowe, obie wymagane, obie tylko na Vercelu:
//   PARTNER_API_BASE   adres API prop firmy (bez ukośnika na końcu)
//   PARTNER_API_TOKEN  sekret nagłówka X-Partner-Token, wspólny z tamtą stroną

// Tyle, ile człowiek stojący nad telefonem zniesie bez wrażenia, że coś się
// zacięło. Otwarcie kasy jest wolniejsze niż odczyt (po tamtej stronie leci
// zapytanie do Stripe'a), więc ma własne, dłuższe okno.
const READ_TIMEOUT_MS = 6000;
const START_TIMEOUT_MS = 12000;

export default async function handler(req, res) {
  const base = (process.env.PARTNER_API_BASE || '').replace(/\/+$/, '');
  const secret = process.env.PARTNER_API_TOKEN || '';
  if (!base || !secret) {
    // Głośno w logu, ogólnie na zewnątrz: klientowi nie mówimy, że u nas nie
    // dopięto konfiguracji, ale bez tego wpisu wygląda to jak awaria partnera.
    console.error('[pay] PARTNER_API_BASE / PARTNER_API_TOKEN not configured');
    res.status(503).json({ error: 'unavailable' });
    return;
  }

  const token = String(req.query?.token || '');
  // Token z linku jest urlsafe-base64 i ma stałą długość. Odsiewamy tu śmieci,
  // żeby cudzy skaner katalogów nie chodził nam po API partnera.
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    res.status(404).json({ error: 'not found' });
    return;
  }

  if (req.method === 'GET') return read(res, base, secret, token);
  if (req.method === 'POST') return start(res, base, secret, token);
  res.status(405).json({ error: 'method' });
}

async function read(res, base, secret, token) {
  let odp;
  try {
    odp = await fetch(`${base}/api/pay/${token}`, {
      headers: { 'x-partner-token': secret },
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[pay] read failed', err);
    res.status(502).json({ error: 'upstream' });
    return;
  }
  if (odp.status === 404) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (!odp.ok) {
    // 401 znaczy, że sekrety się rozjechały — to nasza awaria, nie klienta,
    // i musi być widoczna w logu, bo strona pokaże tylko „spróbuj później".
    console.error('[pay] read http', odp.status);
    res.status(502).json({ error: 'upstream' });
    return;
  }
  const d = await odp.json();
  // Przepisujemy pole po polu, zamiast przepuszczać cudzą odpowiedź w całości:
  // gdyby tamta strona kiedyś dołożyła do niej mail kupującego, trafiłby stąd
  // prosto do przeglądarki.
  const out = {
    item: String(d.item || ''),
    amount: Number(d.amount_usd || 0),
    currency: String(d.currency || 'USD'),
    reference: String(d.reference || ''),
    status: String(d.status || ''),
  };
  // Cena sprzed rabatu przychodzi tylko dla zamówień, które go dostały. Trzy
  // pola albo żadne: sama przekreślona kwota bez procentu (lub odwrotnie) to
  // pół komunikatu. Warunek na kwotę jest tu drugi raz — po tamtej stronie
  // pilnuje tego to samo, ale przekreślona cena NIŻSZA od płaconej byłaby
  // najgorszą możliwą pomyłką na stronie, na której ktoś wpisuje kartę.
  if (Number(d.list_amount_usd || 0) > out.amount) {
    out.listAmount = Number(d.list_amount_usd);
    out.discount = Number(d.discount_usd || 0);
    out.discountPct = Number(d.discount_pct || 0);
  }
  res.status(200).json(out);
}

async function start(res, base, secret, token) {
  // Sekret NIE otwiera tu niczego — `start` jest publiczne po tamtej stronie,
  // bo token JEST wstępem. Mówi tylko, kto kliknął, a od tego zależy jedno:
  // adres powrotu z kasy. Bez nagłówka Stripe odsyła klienta na domenę prop
  // firmy, do portalu marki, o której nikt mu nie mówił.
  //
  // Zapytanie idzie przez nas także po to, żeby klient nie zobaczył cudzej
  // domeny w zakładce sieci ani sekundę wcześniej, niż zobaczy ją na kasie.
  let odp;
  try {
    odp = await fetch(`${base}/api/pay/${token}/start`, {
      method: 'POST',
      headers: { 'x-partner-token': secret },
      signal: AbortSignal.timeout(START_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[pay] start failed', err);
    res.status(502).json({ error: 'upstream' });
    return;
  }
  const d = await odp.json().catch(() => ({}));
  if (!odp.ok) {
    // „Już zapłacone" i „link nieaktywny" to jedyne odpowiedzi, które klient
    // ma prawo przeczytać dosłownie — sam je wywołał i sam może na nie
    // zareagować. Reszta idzie jako awaria.
    const powod = typeof d.detail === 'string' ? d.detail : '';
    console.error('[pay] start http', odp.status, powod);
    res.status(odp.status === 400 ? 400 : 502)
      .json({ error: odp.status === 400 ? powod || 'inactive' : 'upstream' });
    return;
  }
  if (!d.checkout_url) {
    console.error('[pay] start returned no checkout_url');
    res.status(502).json({ error: 'upstream' });
    return;
  }
  res.status(200).json({ checkout_url: d.checkout_url });
}
