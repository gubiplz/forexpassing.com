// Odświeża pas certyfikatów na /meta danymi z Pro Traders Funding.
//
//   node bin/sync-payouts.mjs
//
// Pobiera publiczny endpoint PTF i zapisuje src/data/payouts.ts. Uruchamiany
// RĘCZNIE, nie w kroku build — dzięki temu build Vercela nie zależy od sieci
// ani od tego, czy PTF akurat odpowiada, a w repo widać dokładnie, jakie dane
// poszły na produkcję.
//
// Wpisywane są wyłącznie rekordy zwrócone przez API. Nic nie jest dopisywane
// ręcznie — jeśli baza jest pusta, sekcja na stronie po prostu się nie renderuje.

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'payouts.ts');

// PTF_ORIGIN pozwala wycelować skrypt w lokalną instancję PTF i sprawdzić, jak
// wygląda karta z pełnym certyfikatem, zanim zmiana pojedzie na produkcję.
const ORIGIN = process.env.PTF_ORIGIN || 'https://protradersfunding.com';
const API = `${ORIGIN}/api/public/certificates/recent`;
const STATS_API = `${ORIGIN}/api/public/stats`;

// Grosze pokazujemy tylko wtedy, gdy naprawdę są. Zaokrąglona wypłata ma iść
// jako "$5,760", a nie "$5,760.00" — ale $900.40 nie może wyjść jako "$900.4",
// bo samo toLocaleString obcina końcowe zero i kwota przestaje wyglądać na kwotę.
const money = (n) => {
  const v = Number(n);
  const cents = !Number.isInteger(v);
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`;
};

const res = await fetch(API);
if (!res.ok) {
  console.error(`[sync-payouts] ${API} → ${res.status}`);
  process.exit(1);
}
const rows = await res.json();

let stats = null;
try {
  const s = await fetch(STATS_API);
  if (s.ok) stats = await s.json();
} catch {
  // Statystyki są opcjonalne — pas działa bez nich.
}

// Wszystkie typy certyfikatów, tak jak na pasku "Recently issued" u PTF:
// payout pokazuje kwotę wypłaty (zielona), pozostałe rozmiar konta (biała).
const fmtDate = (iso) => {
  const [y, m, d] = String(iso ?? '').slice(0, 10).split('-');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return y && m && d ? `${MON[Number(m) - 1]} ${Number(d)}, ${y}` : '';
};

const certs = rows
  .filter((r) => r.kind === 'payout' ? Number(r.amount_usd) > 0 : Number(r.account_size) > 0)
  .map((r) => {
    const payout = r.kind === 'payout';
    return {
      payout,
      // "Payout" / "Funded trader" / "Phase 1 passed" — etykieta prosto z API.
      eyebrow: payout ? 'Payout' : String(r.kind_label ?? '').trim(),
      amountLabel: payout ? 'for the amount of' : 'Account size',
      amount: money(payout ? r.amount_usd : r.account_size),
      trader: String(r.trader ?? '').trim(),
      date: fmtDate(r.issued_at),
      // Druga metryka: przy wypłacie rozmiar konta, przy reszcie nazwa programu.
      metaLabel: payout ? 'Account size' : 'Program',
      metaValue: payout ? money(r.account_size) : String(r.program ?? '').trim(),
      // Token pojawia się tylko przy wypłatach, na które trader zgodził się
      // publikacją pełnego dokumentu — PTF nie wystawia go dla reszty.
      certToken: String(r.cert_token ?? '').trim(),
    };
  });

// Dla certyfikatów ze zgodą dociągamy dokument: kod QR jest per certyfikat, więc
// karta na stronie skanuje się do TEJ wypłaty, a nie do ogólnej strony
// weryfikacji. To jest cała różnica między „zeskanuj, a firma to potwierdzi"
// będącym obietnicą a byciem prawdą.
for (const c of certs) {
  if (!c.certToken) continue;
  try {
    const v = await fetch(`${ORIGIN}/api/verify/${encodeURIComponent(c.certToken)}`);
    if (!v.ok) throw new Error(`HTTP ${v.status}`);
    const doc = await v.json();
    if (!doc.found) throw new Error('found=false');
    // Dokument jest źródłem prawdy dla kwoty i nazwiska — pas i weryfikacja nie
    // mogą się rozjechać, bo rozjazd zauważy dokładnie ten człowiek, który
    // sprawdza, czy to prawda.
    if (doc.amount) c.amount = String(doc.amount);
    if (doc.trader_name) c.trader = String(doc.trader_name);
    c.qrSvg = String(doc.qr_svg ?? '').trim();
    c.verifyUrl = `${ORIGIN}/verify/${c.certToken}`;
  } catch (err) {
    // Nie da się potwierdzić => karta zostaje w wersji zamaskowanej. Lepiej
    // pokazać mniej niż numer certyfikatu, którego nikt nie zweryfikuje.
    console.warn(`[sync-payouts] ${c.certToken}: ${err.message} — karta bez weryfikacji`);
    c.certToken = '';
  }
}

const header = `// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: ${API}
// Pobrano: ${new Date().toISOString().slice(0, 10)}
//
// Certyfikaty wystawione przez Pro Traders Funding klientom Forex Passing.
// Kształt pól odwzorowuje pasek "Recently issued" na protradersfunding.com,
// żeby karty wyglądały dokładnie jak oryginalny dokument.

export type PayoutCert = {
  payout: boolean
  eyebrow: string
  amountLabel: string
  amount: string
  trader: string
  date: string
  metaLabel: string
  metaValue: string
  /** Numer certyfikatu — jest tylko wtedy, gdy trader zgodził się na publikację
   *  pełnego dokumentu. Pusty string = karta w wersji zamaskowanej. */
  certToken: string
  /** Kod QR TEJ wypłaty, prosto z dokumentu. Bez tokenu nie istnieje. */
  qrSvg?: string
  /** Pełny adres weryfikacji, do wydrukowania pod kodem. */
  verifyUrl?: string
}
`;

const body = `
export const PAYOUT_CERTS: PayoutCert[] = ${JSON.stringify(certs, null, 2)}

// Zbiorcze liczby z /api/public/stats — \`null\`, gdy endpoint nie odpowiedział.
export const PAYOUT_TOTALS = ${
  stats
    ? JSON.stringify(
        {
          count: stats.payouts_count ?? certs.filter((c) => c.payout).length,
          totalUsd: money(stats.payouts_total_usd ?? 0),
          largestUsd: money(stats.largest_payout_usd ?? 0),
          fundedAccounts: stats.funded_accounts ?? 0,
        },
        null,
        2
      )
    : 'null'
}
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, header + body);

console.log(
  `[sync-payouts] zapisano ${certs.length} certyfikatów → src/data/payouts.ts` +
    (stats ? ` (łącznie ${money(stats.payouts_total_usd ?? 0)})` : '')
);

// Pas pokazuje mniej wypłat niż `/stats` liczy i to jest NORMALNE: na pas
// wchodzą tylko te oznaczone w panelu PTF jako "On LP", a licznik obejmuje
// wszystkie wypłacone. Wcześniejsza wersja tego ostrzeżenia mówiła "endpoint
// obcina listę, trzeba go stronicować" — czyli wysyłała człowieka naprawiać
// stronicowanie, którego nie ma. Różnica to lista niewpuszczonych, nie usterka.
if (stats?.payouts_count != null) {
  const naPasie = certs.filter((c) => c.payout).length;
  const poza = stats.payouts_count - naPasie;
  if (poza > 0) {
    console.log(
      `[sync-payouts] ${naPasie} z ${stats.payouts_count} wypłat jest na pasie; ` +
        `${poza} nie wpuszczono (przełącznik "On LP" w panelu PTF). ` +
        'Nagłówek liczy wszystkie wypłacone, więc te liczby mają prawo się różnić.'
    );
  }
}

const zeZgoda = certs.filter((c) => c.certToken).length;
console.log(
  zeZgoda
    ? `[sync-payouts] ${zeZgoda} kart z pełnym certyfikatem (nazwisko, kwota co do centa, QR do weryfikacji).`
    : '[sync-payouts] Wszystkie karty w wersji zamaskowanej — żadna wypłata nie ma jeszcze ' +
        'zgody na pełny dokument ("Full cert" w panelu PTF).'
);
