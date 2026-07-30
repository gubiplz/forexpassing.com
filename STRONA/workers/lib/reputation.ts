// ASN reputation check. CF provides request.cf.asn natively.
// Production deployments refresh dataset from Spamhaus DROP / ipinfo.io / IPQS / MaxMind.

import asnData from '../data/datacenter-asns.json';
import type { ReasonEntry, CfProperties } from './types.ts';

interface AsnEntry {
  asn: number;
  org: string;
  platform: string;
  weight: number;
}

// Flatten datasetu do Map<asn, entry> dla O(1) lookup
const ASN_MAP = new Map<number, AsnEntry & { category: string }>();

function indexAsns() {
  const categories = ['ad_platforms', 'cloud_datacenters', 'security_vendors', 'vpn_residential_proxy'] as const;
  for (const cat of categories) {
    const bucket = (asnData as Record<string, { asns?: AsnEntry[] }>)[cat];
    if (!bucket?.asns) continue;
    for (const entry of bucket.asns) {
      ASN_MAP.set(entry.asn, { ...entry, category: cat });
    }
  }
}
indexAsns();

export function analyzeReputation(cf: CfProperties | undefined): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  if (!cf || typeof cf.asn !== 'number') {
    // Brak danych CF — bardzo nietypowe (lokalne dev mode). Nie penalize.
    return reasons;
  }

  const entry = ASN_MAP.get(cf.asn);

  if (!entry) {
    // ASN nie jest na blacklist — najprawdopodobniej residential ISP (Orange, T-Mobile, UPC).
    // To dobry znak — większość zwykłych userów siedzi na residential.
    reasons.push({
      code: 'residential_asn',
      detail: `AS${cf.asn}${cf.asOrganization ? ` ${cf.asOrganization}` : ''}`,
      weight: 15,
    });
    return reasons;
  }

  // Match na liście — przemapuj kategorię na ReasonCode
  const codeMap = {
    ad_platforms: entry.platform === 'meta' ? 'asn_meta' : 'asn_google',
    cloud_datacenters: 'asn_datacenter',
    security_vendors: 'asn_security_vendor',
    vpn_residential_proxy: 'asn_vpn',
  } as const;

  const code = codeMap[entry.category as keyof typeof codeMap] ?? 'asn_datacenter';

  reasons.push({
    code: code as ReasonEntry['code'],
    detail: `AS${entry.asn} ${entry.org} (${entry.platform})`,
    weight: entry.weight,
  });

  // CF Bot Management (Enterprise) — score 1-99. <30 high bot probability.
  if (cf.botManagement?.score !== undefined) {
    const cfScore = cf.botManagement.score;
    if (cfScore < 30) {
      reasons.push({
        code: 'cf_bot_score_low',
        detail: `CF Bot Score ${cfScore} (high bot probability)`,
        weight: -70,
      });
    } else if (cfScore > 70) {
      reasons.push({
        code: 'cf_bot_score_high',
        detail: `CF Bot Score ${cfScore} (likely human)`,
        weight: 25,
      });
    }
  }

  if (cf.botManagement?.verifiedBot) {
    reasons.push({
      code: 'cf_verified_bot',
      detail: 'CF verifiedBot=true (known crawler)',
      weight: -80,
    });
  }

  return reasons;
}
