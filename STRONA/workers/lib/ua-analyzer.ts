// User-Agent + Client Hints + header order analysis.
// Real Chrome 89+ sends Sec-Ch-Ua; headless without flags doesn't.

import botData from '../data/bot-uas.json';
import type { ReasonEntry } from './types.ts';

interface UaPattern {
  pattern: string;
  vendor: string;
  weight: number;
  regex?: boolean;
}

interface UaBucket {
  patterns?: UaPattern[];
}

// Kategoryzacja → ReasonCode mapping
const CATEGORY_TO_CODE = {
  ad_review_bots: 'ua_meta_bot' as const,
  search_engine_crawlers: 'ua_generic_bot' as const,
  seo_scraper_bots: 'ua_seo_scraper' as const,
  security_scanners: 'ua_security_scanner' as const,
  headless_browsers: 'ua_headless' as const,
  http_libraries: 'ua_http_library' as const,
  generic_bot_keywords: 'ua_generic_bot' as const,
};

interface CompiledPattern {
  matcher: (ua: string) => boolean;
  vendor: string;
  weight: number;
  category: keyof typeof CATEGORY_TO_CODE;
  raw: string;
}

const COMPILED: CompiledPattern[] = [];

function compilePatterns() {
  for (const cat of Object.keys(CATEGORY_TO_CODE) as Array<keyof typeof CATEGORY_TO_CODE>) {
    const bucket = (botData as Record<string, UaBucket>)[cat];
    if (!bucket?.patterns) continue;
    for (const p of bucket.patterns) {
      const matcher = p.regex
        ? (() => {
            const re = new RegExp(p.pattern, 'i');
            return (ua: string) => re.test(ua);
          })()
        : ((needle: string) => (ua: string) => ua.toLowerCase().includes(needle.toLowerCase()))(p.pattern);
      COMPILED.push({
        matcher,
        vendor: p.vendor,
        weight: p.weight,
        category: cat,
        raw: p.pattern,
      });
    }
  }
}
compilePatterns();

// A real Safari UA is "Mozilla/5.0 (<Apple device>) AppleWebKit/605.x (KHTML,
// like Gecko) Version/<n> ... Safari/<n>". Chromium and every UA-spoofing library
// that borrows the Safari string drops the Version/ token, so requiring the whole
// shape keeps this from becoming a free +20 for anyone who claims to be Safari.
export function isCoherentSafari(ua: string): boolean {
  if (/Chrome\/|Chromium\/|Edg\/|OPR\/|Android/i.test(ua)) return false;
  if (!/\(([^)]*\b(iPhone|iPad|iPod|Macintosh)\b[^)]*)\)/.test(ua)) return false;
  return /AppleWebKit\/605\./.test(ua) && /Version\/\d+/.test(ua) && /Safari\/\d+/.test(ua);
}

// iOS ships one engine: every browser there, Brave and Chrome included, is WebKit
// wearing a different badge. So Chromium-only expectations must not apply.
export function isAppleWebKitPlatform(ua: string): boolean {
  return /\b(iPhone|iPad|iPod)\b/.test(ua) || isCoherentSafari(ua);
}

export function analyzeUserAgent(headers: Headers): ReasonEntry[] {
  const ua = headers.get('user-agent') ?? '';
  const reasons: ReasonEntry[] = [];

  // 1. Empty / too short UA
  if (!ua) {
    reasons.push({ code: 'ua_empty', detail: 'no user-agent header', weight: -100 });
    return reasons; // nie ma sensu dalej checkować
  }

  if (ua.length < 20) {
    reasons.push({ code: 'ua_too_short', detail: `length=${ua.length}`, weight: -80 });
  }

  // 2. Brak Mozilla prefix (nietypowe — prawie wszystkie browsery zaczynają od Mozilla/5.0)
  if (!ua.startsWith('Mozilla/')) {
    reasons.push({ code: 'ua_no_mozilla', detail: ua.slice(0, 40), weight: -30 });
  }

  // 3. Pattern matching przeciw bazie botów
  // Bierzemy NAJSILNIEJSZY match (najmocniej ujemny weight) z każdej kategorii,
  // żeby nie podwajać kar za to samo (np. "Googlebot" matchuje też "bot").
  const matchesByCategory = new Map<keyof typeof CATEGORY_TO_CODE, CompiledPattern>();
  for (const p of COMPILED) {
    if (p.matcher(ua)) {
      const existing = matchesByCategory.get(p.category);
      if (!existing || p.weight < existing.weight) {
        matchesByCategory.set(p.category, p);
      }
    }
  }

  for (const [category, match] of matchesByCategory) {
    reasons.push({
      code: CATEGORY_TO_CODE[category],
      detail: `${match.vendor}: "${match.raw}"`,
      weight: match.weight,
    });
  }

  // 4. Client Hints consistency check
  // Prawdziwy Chrome 89+ na desktopie/mobile wysyła Sec-Ch-Ua zawsze (chyba że
  // wyłączone w prefs, co prawie nikt nie robi). Headless Chrome bez specjalnych
  // flag NIE wysyła. To bardzo tani i skuteczny tell.
  const claimsChrome = /Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const claimsModernChrome = (() => {
    const m = ua.match(/Chrome\/(\d+)/);
    return m ? Number.parseInt(m[1], 10) >= 89 : false;
  })();

  const hasSecChUa = headers.has('sec-ch-ua');
  const hasSecChUaMobile = headers.has('sec-ch-ua-mobile');
  const hasSecChUaPlatform = headers.has('sec-ch-ua-platform');

  if (claimsChrome && claimsModernChrome && !hasSecChUa) {
    reasons.push({
      code: 'missing_client_hints',
      detail: 'Chrome 89+ UA but no Sec-Ch-Ua header (likely headless or HTTP lib spoofing UA)',
      weight: -50,
    });
  } else if (hasSecChUa && hasSecChUaMobile && hasSecChUaPlatform) {
    reasons.push({
      code: 'client_hints_ok',
      detail: `Sec-Ch-Ua=${headers.get('sec-ch-ua')?.slice(0, 50)}`,
      weight: 20,
    });
  } else if (isCoherentSafari(ua)) {
    // Safari never sends client hints — that is WebKit, not a tell. Without an
    // equivalent credit every iPhone scored 20 below an identical Chrome user,
    // and Meta traffic is mostly iPhones, so the gate was rejecting its own
    // audience. The UA still has to be internally consistent to earn it.
    reasons.push({
      code: 'ua_safari_coherent',
      detail: ua.slice(0, 60),
      weight: 20,
    });
  }

  // 5. Accept-Language obecność — prawdziwa przeglądarka zawsze wysyła.
  if (!headers.has('accept-language')) {
    reasons.push({
      code: 'accept_language_missing',
      detail: 'no Accept-Language header',
      weight: -40,
    });
  }

  // 6. Header order — krótki sanity check. Prawdziwy Chrome wysyła headery
  // w deterministycznej kolejności: host, connection, sec-ch-ua, sec-ch-ua-mobile,
  // sec-ch-ua-platform, upgrade-insecure-requests, user-agent, accept, ...
  // Jeżeli `user-agent` przychodzi PRZED `sec-ch-ua` — to atypowe (curl, Go).
  // Workers headers iteration order = original wire order.
  if (claimsChrome && hasSecChUa) {
    const order: string[] = [];
    headers.forEach((_v, k) => order.push(k));
    const uaIdx = order.indexOf('user-agent');
    const chuaIdx = order.indexOf('sec-ch-ua');
    if (uaIdx >= 0 && chuaIdx >= 0 && uaIdx < chuaIdx) {
      reasons.push({
        code: 'header_order_atypical',
        detail: 'user-agent before sec-ch-ua (typowy dla curl-impersonate / spoof)',
        weight: -30,
      });
    }
  }

  // Jeśli nic złego nie znaleźliśmy i UA wygląda normalnie → mały plus
  if (
    reasons.length === 0 ||
    (reasons.length === 1 &&
      (reasons[0].code === 'client_hints_ok' || reasons[0].code === 'ua_safari_coherent'))
  ) {
    if (ua.length > 60 && ua.startsWith('Mozilla/')) {
      reasons.push({ code: 'ua_ok', detail: ua.slice(0, 60), weight: 10 });
    }
  }

  return reasons;
}
