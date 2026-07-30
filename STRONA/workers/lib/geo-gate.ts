// Geo gate — whitelist target country (PL) + flag high-risk research hubs.

import type { ReasonEntry, CfProperties } from './types.ts';

const ALLOWED_COUNTRIES = new Set([
  'PL', // target primary
  'XX', // wrangler dev local = brak kraju, traktuj jako allowed dla dev mode
]);

// Kraje wysokiego ryzyka (security research, threat intel HQ)
const HIGH_RISK_COUNTRIES = new Set([
  'US', // ZScaler, Palo Alto, Symantec, FBI cybersec
  'IL', // Check Point, Cybereason
  'GB', // NCSC, Sophos
  'DE', // BSI, Cisco Talos EU
  'NL', // Group-IB, Fox-IT
  'RU', // Kaspersky, Group-IB (skip jeżeli Ru jest też targetem)
]);

export function analyzeGeo(cf: CfProperties | undefined): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  if (!cf?.country) {
    // Bez geo info — typowo wrangler dev. Nie penalize.
    return reasons;
  }

  const country = cf.country.toUpperCase();

  if (ALLOWED_COUNTRIES.has(country)) {
    reasons.push({
      code: 'geo_pl',
      detail: `country=${country}${cf.city ? ` (${cf.city})` : ''}`,
      weight: 25,
    });
  } else if (HIGH_RISK_COUNTRIES.has(country)) {
    reasons.push({
      code: 'geo_blocked_country',
      detail: `country=${country} (high-risk: security research hub)`,
      weight: -80,
    });
  } else {
    reasons.push({
      code: 'geo_blocked_country',
      detail: `country=${country} (outside target)`,
      weight: -40,
    });
  }

  return reasons;
}
