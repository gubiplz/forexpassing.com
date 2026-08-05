// Odświeża pas certyfikatów na /meta danymi z Pro Traders Funding.
//
//   node bin/sync-payouts.mjs
//
// Pobiera publiczny endpoint PTF i zapisuje src/data/payouts.ts. Uruchamiany
// RĘCZNIE, nie w kroku build — dzięki temu build Vercela nie zależy od sieci
// ani od tego, czy PTF akurat odpowiada, a w repo widać dokładnie, jakie dane
// poszły na produkcję.
//
// Wpisywane są wyłącznie rekordy pobrane z serwerów PTF — z API albo z
// publicznej strony certyfikatu. Nic nie jest wystukiwane z palca; jeśli baza
// jest pusta, sekcja na stronie po prostu się nie renderuje.

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'payouts.ts');

const API = 'https://protradersfunding.com/api/public/certificates/recent';
const STATS_API = 'https://protradersfunding.com/api/public/stats';
const CERT_URL = (token) => `https://protradersfunding.com/payout/${token}`;

// Certyfikaty, których /recent NIE oddaje. Endpoint nazywa się "recent" i
// faktycznie trzyma wycinek: 2026-08-05 zwracał 12 wypłat, a /stats mówiło
// o 16. Brakujących nie da się wciągnąć przez API, więc idą po tokenie —
// każdy to publiczna strona certyfikatu na serwerze PTF, parsowana tak samo
// jak reszta. Tokeny, które /recent i tak zwraca, mogą tu spokojnie zostać:
// scalanie odsiewa powtórki, a lista sama się broni, gdyby PTF kiedyś zdjął
// któryś rekord z API.
const EXTRA_TOKENS = [
  '39tDSaj9GR3YrlMGAEJzJg',
  'aScga2j9ufNh383WtlJotg',
  'ssWys9FTzENvHAQE4vb38Q',
  'dI8jRxGipQ564SYQ1mLd-A',
  'w15jLEO5BaCFKkmyVVfMpQ',
  'VebUJe3fHIZs2YwZBwHIoA',
];

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

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
      _iso: String(r.issued_at ?? '').slice(0, 10),
      _usd: Math.round(Number(payout ? r.amount_usd : r.account_size)),
    };
  });

/* --- certyfikaty spoza /recent, po tokenie -------------------------------- */

// Strona certyfikatu jest renderowana serwerowo, więc wystarczy wyciąć pola.
const field = (html, cls) => {
  const m = html.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)<`));
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
};
// Kafelki "Data" / "Account size" na dole certyfikatu: <div><b>wartość</b><span>etykieta</span>
const metaOf = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<div><b>([^<]+)<\/b><span>([^<]+)<\/span>/g)].map((m) => [m[2].trim(), m[1].trim()])
  );
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "04 Aug 2026" → "2026-08-04"
const isoOf = (d) => {
  const [dd, mm, yy] = String(d).split(/\s+/);
  const i = MON.indexOf(mm);
  return i < 0 ? '' : `${yy}-${String(i + 1).padStart(2, '0')}-${dd.padStart(2, '0')}`;
};
// Certyfikat drukuje pełne nazwisko, API skraca do inicjału. Trzymamy się
// formy z API — inaczej połowa kart na stronie miałaby inny format niż druga.
const shorten = (full) => {
  const p = String(full).trim().split(/\s+/);
  return p.length < 2 ? p.join(' ') : `${p[0]} ${p[p.length - 1][0]}.`;
};

for (const token of EXTRA_TOKENS) {
  const r = await fetch(CERT_URL(token));
  if (!r.ok) {
    console.warn(`[sync-payouts] ${CERT_URL(token)} → ${r.status}, pomijam`);
    continue;
  }
  const html = await r.text();
  const meta = metaOf(html);
  const usd = Math.round(Number(field(html, 'cert-amount').replace(/[$,]/g, '')));
  const iso = isoOf(meta['Date']);
  if (!usd || !iso) {
    console.warn(`[sync-payouts] ${token}: nie dało się odczytać kwoty/daty, pomijam`);
    continue;
  }
  // Ten sam przelew potrafi przyjść i z API, i z tokena. Kwota + dzień +
  // rozmiar konta wystarczą: dwie różne wypłaty nie trafiają się co do centa
  // tego samego dnia na koncie tej samej wielkości.
  const size = meta['Account size'] ?? '';
  const dup = certs.find((c) => c._usd === usd && c._iso === iso && c.metaValue === size);
  if (dup) {
    console.log(`[sync-payouts] ${token}: już jest w /recent jako ${dup.trader} ${dup.amount}, pomijam`);
    continue;
  }
  certs.push({
    payout: true,
    eyebrow: 'Payout',
    amountLabel: 'for the amount of',
    amount: money(usd),
    trader: shorten(field(html, 'cert-person')),
    date: `${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`,
    metaLabel: 'Account size',
    metaValue: size,
    _iso: iso,
    _usd: usd,
  });
  console.log(`[sync-payouts] ${token}: dołożony spoza /recent — ${money(usd)} ${iso}`);
}

// Najświeższe u góry, jak na pasku "Recently issued".
certs.sort((a, b) => (a._iso < b._iso ? 1 : a._iso > b._iso ? -1 : b._usd - a._usd));
for (const c of certs) {
  delete c._iso;
  delete c._usd;
}

const header = `// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: ${API}
//         + ${EXTRA_TOKENS.length} certyfikatów po tokenie (patrz EXTRA_TOKENS w skrypcie)
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

// Endpoint nazywa się "recent" i faktycznie obcina listę — chcemy o tym wiedzieć,
// zamiast po cichu publikować wycinek. Kart bywa mniej niż wypłat w /stats i to
// jest w porządku (brakujące dociągamy tokenami), byle luka była widoczna.
if (stats?.payouts_count != null) {
  const fetched = certs.filter((c) => c.payout).length;
  if (fetched < stats.payouts_count) {
    console.warn(
      `[sync-payouts] UWAGA: mamy ${fetched} kart wypłat, a /stats mówi o ${stats.payouts_count}. ` +
        `Brakuje ${stats.payouts_count - fetched} — dopisz ich tokeny do EXTRA_TOKENS.`
    );
  }
}
