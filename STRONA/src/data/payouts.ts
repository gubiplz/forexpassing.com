// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: https://protradersfunding.com/api/public/certificates/recent
// Pobrano: 2026-07-31
//
// To są certyfikaty wypłat wystawione przez Pro Traders Funding. NIE są dowodem
// na to, że Forex Passing zarządzał tymi kontami — podpis pod sekcją mówi to wprost.

export type PayoutCert = {
  trader: string
  amount: string
  accountSize: string
  issued: string
}

export const PAYOUT_CERTS: PayoutCert[] = [
  {
    "trader": "Michael D.",
    "amount": "$2,001",
    "accountSize": "$50,000",
    "issued": "2026-07-30"
  },
  {
    "trader": "Michael D.",
    "amount": "$711",
    "accountSize": "$50,000",
    "issued": "2026-07-29"
  },
  {
    "trader": "Michael D.",
    "amount": "$2,000",
    "accountSize": "$50,000",
    "issued": "2026-07-29"
  },
  {
    "trader": "Michael D.",
    "amount": "$500",
    "accountSize": "$50,000",
    "issued": "2026-07-28"
  },
  {
    "trader": "Michael D.",
    "amount": "$417",
    "accountSize": "$50,000",
    "issued": "2026-07-28"
  }
]

// Zbiorcze liczby z /api/public/stats — `null`, gdy endpoint nie odpowiedział.
export const PAYOUT_TOTALS = {
  "count": 5,
  "totalUsd": "$5,630",
  "largestUsd": "$2,001",
  "fundedAccounts": 3
}
