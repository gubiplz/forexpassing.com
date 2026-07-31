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

// Do pasa idą tylko certyfikaty wypłat. Certyfikaty "phase 1 / phase 2 / funded"
// to potwierdzenia etapu, nie pieniądze — mieszanie ich sugerowałoby wypłatę.
const payouts = rows
  .filter((r) => r.kind === 'payout' && Number(r.amount_usd) > 0)
  .map((r) => ({
    trader: String(r.trader ?? '').trim(),
    amount: money(r.amount_usd),
    accountSize: money(r.account_size),
    issued: String(r.issued_at ?? '').slice(0, 10),
  }));

const header = `// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: ${API}
// Pobrano: ${new Date().toISOString().slice(0, 10)}
//
// To są certyfikaty wypłat wystawione przez Pro Traders Funding. NIE są dowodem
// na to, że Forex Passing zarządzał tymi kontami — podpis pod sekcją mówi to wprost.

export type PayoutCert = {
  trader: string
  amount: string
  accountSize: string
  issued: string
}
`;

const body = `
export const PAYOUT_CERTS: PayoutCert[] = ${JSON.stringify(payouts, null, 2)}

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
  `[sync-payouts] zapisano ${payouts.length} certyfikatów wypłat → src/data/payouts.ts` +
    (stats ? ` (łącznie ${money(stats.payouts_total_usd ?? 0)})` : '')
);
