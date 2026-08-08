// Score aggregation + classification.

import type { Verdict, ReasonEntry, ReasonCode, Classification, ClientSignals } from './types.ts';
import { isEmbeddedWebView } from './ua-analyzer.ts';

// A UA that named itself as automation. The ad-platform crawlers all land here.
const BOT_UA_CODES: ReasonCode[] = [
  'ua_meta_bot', 'ua_google_bot', 'ua_security_scanner', 'ua_seo_scraper',
  'ua_headless', 'ua_http_library', 'ua_generic_bot',
  'ua_empty', 'ua_too_short', 'ua_no_mozilla',
];

// A UA that held together as a real browser.
const BROWSER_UA_CODES: ReasonCode[] = ['client_hints_ok', 'ua_safari_coherent', 'ua_ok'];

/**
 * The -100 on an ad platform's ASN is aimed at its crawler, which arrives from
 * that network. But the Facebook app's in-app browser egresses from the same
 * ASN, so a real person who tapped the ad and never left the app was scored as
 * Meta's own crawler and handed the safe page — a paid click, burned.
 *
 * The crawler is already caught by ua_meta_bot, which is a hard override and
 * does not need the ASN's help. So when nothing in the UA suggests automation
 * and the UA holds together as a browser, the ASN on its own is not evidence.
 * Some suspicion is kept: traffic still has to earn its way past the gate on
 * click id and fingerprint.
 */
function reconcileAdPlatformAsn(reasons: ReasonEntry[]): ReasonEntry[] {
  const isAdPlatformAsn = (c: ReasonCode) => c === 'asn_meta' || c === 'asn_google';
  if (!reasons.some((r) => isAdPlatformAsn(r.code))) return reasons;
  if (reasons.some((r) => BOT_UA_CODES.includes(r.code))) return reasons;
  if (!reasons.some((r) => BROWSER_UA_CODES.includes(r.code))) return reasons;

  return reasons.map((r) =>
    isAdPlatformAsn(r.code)
      ? {
          code: 'asn_inapp_browser' as ReasonCode,
          detail: `${r.detail ?? ''} — browser UA, treated as in-app browser`,
          weight: -15,
        }
      : r
  );
}

export function buildVerdict(
  reasons: ReasonEntry[],
  requestId: string,
  cookieIssued: boolean
): Verdict {
  const normalized = reconcileAdPlatformAsn(reasons).map((r) => ({
    ...r,
    weight: Math.max(-100, Math.min(100, r.weight)),
  }));
  const rawScore = normalized.reduce((acc, r) => acc + r.weight, 0);
  const score = Math.max(-100, Math.min(100, rawScore));
  const classification = classify(score, normalized);
  return {
    classification,
    score,
    reasons: normalized,
    injectedAt: Date.now(),
    cookieIssued,
    requestId,
  };
}

function classify(score: number, reasons: ReasonEntry[]): Classification {
  // Hard overrides — single signals strong enough to override sum
  const hardBot = reasons.some((r) =>
    [
      'ua_meta_bot',
      'ua_google_bot',
      'ua_security_scanner',
      'ua_http_library',
      'ua_empty',
      'honeypot_triggered',
      'asn_security_vendor',
      'cf_verified_bot',
      'webdriver_true',
      'challenge_failed',
    ].includes(r.code)
  );
  if (hardBot) return 'bot';

  const hardReviewer = reasons.some(
    (r) =>
      r.code === 'fbclid_already_used' ||
      r.code === 'gclid_already_used' ||
      r.code === 'ttclid_already_used'
  );
  if (hardReviewer) return 'reviewer';

  if (score >= 30) return 'human';
  if (score >= -10) return 'suspicious';
  if (score >= -50) return 'reviewer';
  return 'bot';
}

export function scoreClientSignals(s: ClientSignals, ua = ''): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  // The payload is attacker-controlled: every field is optional in practice, and a
  // throw here would 500 the whole classification instead of scoring the omission.
  const detectedFonts = s.detectedFonts ?? [];
  const rtcLocalIps = s.rtcLocalIps ?? [];
  // iOS Safari and Android WebView are both stripped Chromium-or-not engines.
  // Every "a real Chrome would have this" check below has to skip them, or the
  // gate rejects the in-app browser that Meta opens its own ads in.
  const embedded = isEmbeddedWebView(ua);

  if (s.webdriver === true) {
    reasons.push({ code: 'webdriver_true', detail: 'navigator.webdriver === true', weight: -100 });
  }

  if (s.pluginsCount === 0 && !embedded) {
    reasons.push({
      code: 'no_plugins',
      detail: 'navigator.plugins.length === 0',
      weight: -40,
    });
  }

  if (!s.languages || s.languages.length === 0) {
    reasons.push({ code: 'no_languages', detail: 'navigator.languages empty', weight: -50 });
  }

  if (s.webglRenderer) {
    const r = s.webglRenderer.toLowerCase();
    if (r.includes('swiftshader') || r.includes('mesa') || r.includes('llvmpipe')) {
      reasons.push({
        code: 'webgl_swiftshader',
        detail: `WebGL renderer="${s.webglRenderer}" (software renderer = headless/VM)`,
        weight: -80,
      });
    }
  } else {
    reasons.push({
      code: 'webgl_swiftshader',
      detail: 'WebGL unavailable',
      weight: -50,
    });
  }

  // window.chrome is full-Chrome-only. Every Safari, every iOS browser and every
  // Android WebView lacks it, so an unconditional check charged -50 for the
  // crime of being a phone.
  if (!s.hasChrome && !embedded) {
    reasons.push({
      code: 'missing_chrome_obj',
      detail: 'window.chrome undefined despite Chrome UA',
      weight: -50,
    });
  }

  if (s.permissionsAnomaly) {
    reasons.push({
      code: 'permissions_anomaly',
      detail: 'Notification.permission vs Permissions.query mismatch',
      weight: -60,
    });
  }

  // Storage matrix — headless often disables one/more
  const storageScore =
    [s.hasLocalStorage, s.hasSessionStorage, s.hasIndexedDB, s.hasCookiesEnabled].filter(Boolean)
      .length;
  if (storageScore < 4) {
    reasons.push({
      code: 'storage_disabled',
      detail: `only ${storageScore}/4 storage APIs available`,
      weight: -30,
    });
  }

  // Fonts — headless has deterministic short list
  if (detectedFonts.length === 0) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: 'zero fonts detected (text-measure failed)',
      weight: -40,
    });
  } else if (detectedFonts.length < 5) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: `only ${detectedFonts.length} fonts (headless typical: DejaVu/Liberation)`,
      weight: -25,
    });
  } else if (detectedFonts.length >= 15) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: `${detectedFonts.length} fonts (real OS)`,
      weight: 15,
    });
  }

  // WebRTC IP leak — real browser leaks local IP. Bot in datacenter often gets none.
  if (rtcLocalIps.length === 0) {
    reasons.push({
      code: 'rtc_no_local_ip',
      detail: 'no RTC ICE candidates (firewall/headless)',
      weight: -25,
    });
  } else if (rtcLocalIps.every((ip) => ip.startsWith('127.') || ip === '::1')) {
    reasons.push({
      code: 'rtc_localhost_only',
      detail: 'only loopback IPs (proxy/VM tell)',
      weight: -30,
    });
  }

  // iOS populates getVoices() lazily and an app's WebView usually exposes no
  // voices at all, so on a phone this fires for attentive humans as often as
  // for headless.
  if (s.speechVoicesCount === 0 && !embedded) {
    reasons.push({
      code: 'speech_voices_empty',
      detail: 'speechSynthesis.getVoices() empty (headless)',
      weight: -15,
    });
  }

  // Behavioral
  if (s.mouseEntropy === 0 && s.scrollCount === 0) {
    // A desktop user brushes the mouse without meaning to; a phone user reading
    // the first screen touches nothing. Same silence, very different evidence.
    const touch = (s.maxTouchPoints ?? 0) > 0;
    reasons.push({
      code: 'no_mouse_movement',
      detail: touch ? 'no touch/scroll in 5s (touch device)' : 'no mouse/scroll in 5s',
      weight: touch ? -20 : -50,
    });
  } else if (s.mouseEntropy > 0 && s.mouseEntropy < 50) {
    reasons.push({
      code: 'mouse_entropy_low',
      detail: `mouseEntropy=${s.mouseEntropy.toFixed(0)} (below human baseline 100+)`,
      weight: -20,
    });
  } else if (s.mouseEntropy >= 100) {
    reasons.push({
      code: 'mouse_entropy_human',
      detail: `mouseEntropy=${s.mouseEntropy.toFixed(0)}`,
      weight: 25,
    });
  }

  // Mouse jerk — bots that simulate Bezier curves have very low jerk variance
  if (s.mouseJerk > 0 && s.mouseEntropy > 100 && s.mouseJerk / s.mouseEntropy < 0.01) {
    reasons.push({
      code: 'mouse_jerk_robotic',
      detail: `jerk/entropy ratio ${(s.mouseJerk / s.mouseEntropy).toFixed(4)} (too smooth)`,
      weight: -35,
    });
  }

  if (s.tg) {
    reasons.push({
      code: 'honeypot_triggered',
      detail: 'clicked /_legacy/admin trap (only crawler follows)',
      weight: -100,
    });
  }

  return reasons;
}
