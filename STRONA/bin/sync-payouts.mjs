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

const API = 'https://protradersfunding.com/api/public/certificates/recent';
const STATS_API = 'https://protradersfunding.com/api/public/stats';

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
    };
  });

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
}
`;

const body = `
export const PAYOUT_CERTS: PayoutCert[] = ${JSON.stringify(certs, null, 2)}

// Zbiorcze liczby z /api/public/stats — \`null\`, gdy endpoint nie odpowiedział.
export const PAYOUT_TOTALS = ${
  stats
    ? JSON.stringify(
        {
          count: stats.payouts_count ?? payouts.length,
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

// The endpoint is called "recent" — if it ever starts trimming the list we want
// to know, rather than quietly publishing a slice of the record.
if (stats?.payouts_count != null) {
  const fetched = certs.filter((c) => c.payout).length;
  if (fetched < stats.payouts_count) {
    console.warn(
      `[sync-payouts] UWAGA: API oddało ${fetched} wypłat, a /stats mówi o ${stats.payouts_count}. ` +
        'Endpoint obcina listę — trzeba go stronicować, inaczej publikujemy wycinek.'
    );
  }
}
