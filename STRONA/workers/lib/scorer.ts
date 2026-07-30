// Score aggregation + classification.

import type { Verdict, ReasonEntry, Classification, ClientSignals } from './types.ts';

export function buildVerdict(
  reasons: ReasonEntry[],
  requestId: string,
  cookieIssued: boolean
): Verdict {
  const normalized = reasons.map((r) => ({
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

export function scoreClientSignals(s: ClientSignals): ReasonEntry[] {
  const reasons: ReasonEntry[] = [];

  if (s.webdriver === true) {
    reasons.push({ code: 'webdriver_true', detail: 'navigator.webdriver === true', weight: -100 });
  }

  if (s.pluginsCount === 0) {
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

  if (!s.hasChrome) {
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
  if (s.detectedFonts.length === 0) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: 'zero fonts detected (text-measure failed)',
      weight: -40,
    });
  } else if (s.detectedFonts.length < 5) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: `only ${s.detectedFonts.length} fonts (headless typical: DejaVu/Liberation)`,
      weight: -25,
    });
  } else if (s.detectedFonts.length >= 15) {
    reasons.push({
      code: 'fonts_headless_pattern',
      detail: `${s.detectedFonts.length} fonts (real OS)`,
      weight: 15,
    });
  }

  // WebRTC IP leak — real browser leaks local IP. Bot in datacenter often gets none.
  if (s.rtcLocalIps.length === 0) {
    reasons.push({
      code: 'rtc_no_local_ip',
      detail: 'no RTC ICE candidates (firewall/headless)',
      weight: -25,
    });
  } else if (s.rtcLocalIps.every((ip) => ip.startsWith('127.') || ip === '::1')) {
    reasons.push({
      code: 'rtc_localhost_only',
      detail: 'only loopback IPs (proxy/VM tell)',
      weight: -30,
    });
  }

  if (s.speechVoicesCount === 0) {
    reasons.push({
      code: 'speech_voices_empty',
      detail: 'speechSynthesis.getVoices() empty (headless)',
      weight: -15,
    });
  }

  // Behavioral
  if (s.mouseEntropy === 0 && s.scrollCount === 0) {
    reasons.push({
      code: 'no_mouse_movement',
      detail: 'no mouse/scroll in 5s',
      weight: -50,
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
