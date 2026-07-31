// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: https://protradersfunding.com/api/public/certificates/recent
// Pobrano: 2026-07-31
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

export const PAYOUT_CERTS: PayoutCert[] = [
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$2,001",
    "trader": "Michael D.",
    "date": "Jul 30, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000"
  },
  {
    "payout": false,
    "eyebrow": "Funded trader",
    "amountLabel": "Account size",
    "amount": "$10,000",
    "trader": "Instant B.",
    "date": "Jul 30, 2026",
    "metaLabel": "Program",
    "metaValue": "Instant Funding"
  },
  {
    "payout": false,
    "eyebrow": "Phase 1 passed",
    "amountLabel": "Account size",
    "amount": "$10,000",
    "trader": "Instant B.",
    "date": "Jul 29, 2026",
    "metaLabel": "Program",
    "metaValue": "Instant Funding"
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$711",
    "trader": "Michael D.",
    "date": "Jul 29, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000"
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$2,000",
    "trader": "Michael D.",
    "date": "Jul 29, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000"
  },
  {
    "payout": false,
    "eyebrow": "Phase 2 passed",
    "amountLabel": "Account size",
    "amount": "$50,000",
    "trader": "Michael D.",
    "date": "Jul 28, 2026",
    "metaLabel": "Program",
    "metaValue": "2-Step"
  },
  {
    "payout": false,
    "eyebrow": "Phase 1 passed",
    "amountLabel": "Account size",
    "amount": "$50,000",
    "trader": "Michael D.",
    "date": "Jul 28, 2026",
    "metaLabel": "Program",
    "metaValue": "2-Step"
  },
  {
    "payout": false,
    "eyebrow": "Funded trader",
    "amountLabel": "Account size",
    "amount": "$50,000",
    "trader": "Michael D.",
    "date": "Jul 28, 2026",
    "metaLabel": "Program",
    "metaValue": "2-Step"
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$500",
    "trader": "Michael D.",
    "date": "Jul 28, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000"
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$417",
    "trader": "Michael D.",
    "date": "Jul 28, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000"
  }
]

// Zbiorcze liczby z /api/public/stats — `null`, gdy endpoint nie odpowiedział.
export const PAYOUT_TOTALS = {
  "count": 5,
  "totalUsd": "$5,630",
  "largestUsd": "$2,001",
  "fundedAccounts": 3
}
