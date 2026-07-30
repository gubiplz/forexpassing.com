// TLS fingerprint — CF provides cf.tlsCipher / tlsVersion. JA3-equivalent
// matching against browser vs HTTP-library baselines.

import tlsData from '../data/tls-fingerprints.json';
import type { ReasonEntry, CfProperties } from './types.ts';

interface TlsFingerprint {
  name: string;
  tlsVersion: string;
  tlsCipher: string;
  weight: number;
  note?: string;
}

const BROWSER_FPS: TlsFingerprint[] =
  (tlsData as { browsers?: { fingerprints?: TlsFingerprint[] } }).browsers?.fingerprints ?? [];
const AUTOMATION_FPS: TlsFingerprint[] =
  (tlsData as { automation_tools?: { fingerprints?: TlsFingerprint[] } }).automation_tools
    ?.fingerprints ?? [];

function matches(fp: TlsFingerprint, version: string, cipher: string): boolean {
  return fp.tlsVersion === version && fp.tlsCipher === cipher;
}

export function analyzeTls(cf: CfProperties | undefined): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  if (!cf?.tlsVersion || !cf?.tlsCipher) {
    return reasons;
  }

  const version = cf.tlsVersion;
  const cipher = cf.tlsCipher;

  // 1. Sprawdź czy match z bibliotekami HTTP/automatyzacją
  for (const fp of AUTOMATION_FPS) {
    if (matches(fp, version, cipher)) {
      reasons.push({
        code: 'tls_automation_tool',
        detail: `${fp.name} (${version}/${cipher})`,
        weight: fp.weight,
      });
      return reasons; // jeden match wystarczy — to silny sygnał
    }
  }

  // 2. TLSv1.2 w 2026 to red flag (Chrome/Safari/Firefox dawno wymusiły 1.3)
  if (version === 'TLSv1.2') {
    reasons.push({
      code: 'tls_automation_tool',
      detail: `TLSv1.2 w 2026 (Python requests default, stare HTTP libs)`,
      weight: -60,
    });
    return reasons;
  }

  // 3. Sprawdź czy match z prawdziwymi przeglądarkami
  for (const fp of BROWSER_FPS) {
    if (matches(fp, version, cipher)) {
      reasons.push({
        code: 'tls_browser_match',
        detail: `${fp.name}`,
        weight: fp.weight,
      });
      return reasons;
    }
  }

  // 4. Nieznany — nie penalize ani nie nagradzaj
  reasons.push({
    code: 'tls_unknown',
    detail: `${version}/${cipher} (nieskategoryzowany)`,
    weight: 0,
  });

  return reasons;
}

// Helper dla TZ vs Country mismatch — używamy razem z client-side timezone
export function tzCountryMismatch(country: string | undefined, clientTz: string): boolean {
  if (!country || !clientTz) return false;
  // Bardzo uproszczona heurystyka: PL → Europe/Warsaw.
  // Jeżeli country=PL ale client TZ to America/Los_Angeles → user na VPN/proxy
  // ALBO Polak na wakacjach. Mała wiarygodność, więc tylko -10 weight.
  const COUNTRY_TZ_PREFIX: Record<string, string> = {
    PL: 'Europe/',
    DE: 'Europe/',
    FR: 'Europe/',
    GB: 'Europe/',
    US: 'America/',
    CA: 'America/',
    BR: 'America/',
    JP: 'Asia/',
    CN: 'Asia/',
    AU: 'Australia/',
  };
  const expectedPrefix = COUNTRY_TZ_PREFIX[country];
  if (!expectedPrefix) return false;
  return !clientTz.startsWith(expectedPrefix);
}
