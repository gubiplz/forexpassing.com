// Browser fingerprint collector — collects 30+ signals for /api/event verification.
// State-of-the-art techniques used by DataDome / PerimeterX / Akamai Bot Manager.

import type { ClientSignals } from './state';

type BehavioralSignals = Pick<
  ClientSignals,
  | 'mouseEntropy'
  | 'mouseJerk'
  | 'scrollCount'
  | 'keyboardCount'
  | 'clickTimingVariance'
  | 'pointermoveCount'
  | 'msToFirstInteraction'
  | 'tg'
>;

type FingerprintResult = Omit<ClientSignals, keyof BehavioralSignals | 'challengeProof'>;

// ──────────────────────────────────────────────────────────
// WebGL renderer (anti-headless: SwiftShader / Mesa / ANGLE software)
// ──────────────────────────────────────────────────────────
function getWebGL(): { renderer: string | null; vendor: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return { renderer: null, vendor: null };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) {
      return {
        renderer: gl.getParameter(gl.RENDERER) as string,
        vendor: gl.getParameter(gl.VENDOR) as string,
      };
    }
    return {
      renderer: gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string,
      vendor: gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string,
    };
  } catch {
    return { renderer: null, vendor: null };
  }
}

// ──────────────────────────────────────────────────────────
// Canvas hash (per-GPU+driver+browser deterministic)
// ──────────────────────────────────────────────────────────
async function hashCanvas(): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Forex Passing 2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Forex Passing 2026', 4, 17);
    const dataUrl = canvas.toDataURL();
    const bytes = new TextEncoder().encode(dataUrl);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// AudioContext fingerprint (sampleRate consistency)
// ──────────────────────────────────────────────────────────
async function hashAudio(): Promise<string | null> {
  try {
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    const ctx = new AC();
    const sampleRate = ctx.sampleRate;
    void ctx.close?.();
    return String(sampleRate);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Permissions anomaly — headless Chrome has known mismatch
// ──────────────────────────────────────────────────────────
async function hasPermissionsAnomaly(): Promise<boolean> {
  try {
    if (typeof Notification === 'undefined' || !navigator.permissions) return false;
    const notif = Notification.permission;
    const query = await navigator.permissions.query({ name: 'notifications' as PermissionName });
    if (notif === 'denied' && query.state === 'prompt') return true;
    return false;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// Storage availability matrix (headless quirki)
// ──────────────────────────────────────────────────────────
function checkStorage() {
  let ls = false;
  let ss = false;
  let idb = false;
  let cookies = false;
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    ls = true;
  } catch { /* noop */ }
  try {
    sessionStorage.setItem('__t', '1');
    sessionStorage.removeItem('__t');
    ss = true;
  } catch { /* noop */ }
  try {
    idb = 'indexedDB' in window && typeof indexedDB !== 'undefined';
  } catch { /* noop */ }
  try {
    cookies = navigator.cookieEnabled === true;
  } catch { /* noop */ }
  return { ls, ss, idb, cookies };
}

// ──────────────────────────────────────────────────────────
// Font enumeration — text-measure trick
// Headless often has deterministic list (DejaVu, Liberation Sans, Noto)
// ──────────────────────────────────────────────────────────
const FONT_PROBES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
  'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
  'Trebuchet MS', 'Arial Black', 'Impact',
  'Calibri', 'Cambria', 'Candara', 'Consolas', 'Corbel', 'Franklin Gothic Medium',
  'Lucida Console', 'Lucida Sans Unicode', 'MS Sans Serif', 'MS Serif', 'Segoe UI',
  'Tahoma', 'Geneva', 'Symbol', 'Wingdings',
  // macOS
  'San Francisco', 'SF Pro Display', 'SF Mono', 'Apple Color Emoji', 'Menlo', 'Monaco',
  'Helvetica Neue', 'Avenir Next', 'Optima', 'Hoefler Text', 'Didot',
  // Linux / headless tells
  'DejaVu Sans', 'DejaVu Serif', 'Liberation Sans', 'Liberation Serif',
  'Noto Sans', 'Noto Serif', 'Ubuntu', 'Roboto', 'Cantarell', 'Open Sans',
];

function detectFonts(): string[] {
  try {
    const baseFonts = ['monospace', 'sans-serif', 'serif'] as const;
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const baseWidths: Record<string, number> = {};
    for (const base of baseFonts) {
      ctx.font = `${testSize} ${base}`;
      baseWidths[base] = ctx.measureText(testString).width;
    }
    const detected: string[] = [];
    for (const font of FONT_PROBES) {
      let isDetected = false;
      for (const base of baseFonts) {
        ctx.font = `${testSize} "${font}", ${base}`;
        const w = ctx.measureText(testString).width;
        if (w !== baseWidths[base]) {
          isDetected = true;
          break;
        }
      }
      if (isDetected) detected.push(font);
    }
    return detected;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────
// WebRTC IP leak — leaks local IP even under VPN
// Classic anti-proxy technique used by DataDome since 2019.
// ──────────────────────────────────────────────────────────
async function probeWebRtcIps(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips = new Set<string>();
    let pc: RTCPeerConnection | null = null;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.createDataChannel('');
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        const parts = ev.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && /^[\d.]+$/.test(ip)) ips.add(ip);
        if (ip && /^[a-f0-9:]+$/i.test(ip) && ip.includes(':')) ips.add(ip);
      };
      void pc.createOffer()
        .then((offer) => pc?.setLocalDescription(offer))
        .catch(() => { /* noop */ });
    } catch {
      resolve([]);
      return;
    }
    // Short timeout — most candidates surface in <500ms; longer wait delays verify
    setTimeout(() => {
      try { pc?.close(); } catch { /* noop */ }
      resolve(Array.from(ips));
    }, 600);
  });
}

// ──────────────────────────────────────────────────────────
// Main collector
// ──────────────────────────────────────────────────────────
export async function collectFingerprint(): Promise<FingerprintResult> {
  const [webgl, canvasHash, audioFingerprint, permissionsAnomaly, rtcLocalIps] = await Promise.all([
    Promise.resolve(getWebGL()),
    hashCanvas(),
    hashAudio(),
    hasPermissionsAnomaly(),
    probeWebRtcIps(),
  ]);

  const storage = checkStorage();
  const fonts = detectFonts();

  let speechVoicesCount = 0;
  try {
    speechVoicesCount = window.speechSynthesis?.getVoices().length ?? 0;
  } catch { /* noop */ }

  const hasGamepadApi = typeof navigator.getGamepads === 'function';

  return {
    webdriver: navigator.webdriver === true,
    pluginsCount: navigator.plugins?.length ?? 0,
    languages: Array.from(navigator.languages ?? []),
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
    deviceMemory:
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    webglRenderer: webgl.renderer,
    webglVendor: webgl.vendor,
    canvasHash,
    audioFingerprint,
    screenWidth: screen.width ?? 0,
    screenHeight: screen.height ?? 0,
    screenAvailWidth: screen.availWidth ?? 0,
    colorDepth: screen.colorDepth ?? 0,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    timezoneOffset: new Date().getTimezoneOffset(),
    hasChrome: typeof (window as Window & { chrome?: unknown }).chrome !== 'undefined',
    permissionsAnomaly,
    hasIndexedDB: storage.idb,
    hasLocalStorage: storage.ls,
    hasSessionStorage: storage.ss,
    hasCookiesEnabled: storage.cookies,
    detectedFonts: fonts,
    rtcLocalIps,
    speechVoicesCount,
    hasGamepadApi,
  };
}
