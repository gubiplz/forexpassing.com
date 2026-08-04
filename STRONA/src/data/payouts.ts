// WYGENEROWANE PRZEZ bin/sync-payouts.mjs — nie edytować ręcznie.
// Źródło: https://protradersfunding.com/api/public/certificates/recent
// Pobrano: 2026-08-04
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

export const PAYOUT_CERTS: PayoutCert[] = [
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$1,219",
    "trader": "Eleanor K.",
    "date": "Aug 4, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$6,219",
    "trader": "Imogen I.",
    "date": "Aug 4, 2026",
    "metaLabel": "Account size",
    "metaValue": "$100,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$7,980",
    "trader": "Caleb M.",
    "date": "Aug 1, 2026",
    "metaLabel": "Account size",
    "metaValue": "$800,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$5,760",
    "trader": "Austin R.",
    "date": "Jul 30, 2026",
    "metaLabel": "Account size",
    "metaValue": "$400,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$3,890",
    "trader": "Tyler B.",
    "date": "Jul 28, 2026",
    "metaLabel": "Account size",
    "metaValue": "$100,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$7,420",
    "trader": "Dylan C.",
    "date": "Jul 25, 2026",
    "metaLabel": "Account size",
    "metaValue": "$200,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$6,180",
    "trader": "Ryan F.",
    "date": "Jul 22, 2026",
    "metaLabel": "Account size",
    "metaValue": "$800,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$2,915",
    "trader": "Jacob P.",
    "date": "Jul 19, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$5,340",
    "trader": "Logan T.",
    "date": "Jul 15, 2026",
    "metaLabel": "Account size",
    "metaValue": "$400,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$4,760",
    "trader": "Noah M.",
    "date": "Jul 11, 2026",
    "metaLabel": "Account size",
    "metaValue": "$200,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$3,125",
    "trader": "Mason C.",
    "date": "Jul 7, 2026",
    "metaLabel": "Account size",
    "metaValue": "$100,000",
    "certToken": ""
  },
  {
    "payout": true,
    "eyebrow": "Payout",
    "amountLabel": "for the amount of",
    "amount": "$2,480",
    "trader": "Ethan B.",
    "date": "Jul 3, 2026",
    "metaLabel": "Account size",
    "metaValue": "$50,000",
    "certToken": ""
  }
]

// Zbiorcze liczby z /api/public/stats — `null`, gdy endpoint nie odpowiedział.
export const PAYOUT_TOTALS = {
  "count": 16,
  "totalUsd": "$72,834",
  "largestUsd": "$7,980",
  "fundedAccounts": 29
}
