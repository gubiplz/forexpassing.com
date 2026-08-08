// Geo gate — whitelist target markets + flag high-risk research hubs.

import type { ReasonEntry, CfProperties } from './types.ts';

// The markets the ads actually run in. Anything here is a prospective customer,
// not a suspect — including GB, which is a genuine security-research hub but is
// a market first. Reviewers are caught on click-id replay, not on geography.
const TARGET_COUNTRIES = new Set([
  'US',
  'AU',
  'CA',
  'NZ',
  'GB',
]);

// Not a market — where we sit. Kept on the same footing so the site can be
// opened and checked from the office; without it a visit from here scores as a
// reviewer and the offer page becomes impossible to see in production.
const OPERATOR_COUNTRIES = new Set([
  'PL',
  'XX', // wrangler dev local = brak kraju, traktuj jako allowed dla dev mode
]);

// Kraje wysokiego ryzyka (security research, threat intel HQ). Every target
// market is deliberately absent: penalising a country the campaign buys traffic
// in rejects the audience it is paying for.
const HIGH_RISK_COUNTRIES = new Set([
  'IL', // Check Point, Cybereason
  'DE', // BSI, Cisco Talos EU
  'NL', // Group-IB, Fox-IT
  'RU', // Kaspersky, Group-IB
]);

export function analyzeGeo(cf: CfProperties | undefined): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  if (!cf?.country) {
    // Bez geo info — typowo wrangler dev. Nie penalize.
    return reasons;
  }

  const country = cf.country.toUpperCase();

  if (TARGET_COUNTRIES.has(country) || OPERATOR_COUNTRIES.has(country)) {
    reasons.push({
      code: 'geo_target',
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
