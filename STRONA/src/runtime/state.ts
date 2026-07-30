// Runtime state — collected per request, used by App gate.
// Server (workers/edge.ts) injects window.__INITIAL_STATE__ before SPA boots.

export type Classification = 'human' | 'reviewer' | 'bot' | 'suspicious' | 'unknown';

export interface ReasonEntry {
  code: string;
  detail?: string;
  weight: number;
}

export interface Verdict {
  classification: Classification;
  score: number;
  reasons: ReasonEntry[];
  injectedAt: number;
  cookieIssued: boolean;
  requestId: string;
  // CSRF token wstrzykiwany przez Worker, używany przez POST /api/event
  csrf?: string;
  // Challenge mode — Worker wymaga rozwiązania challenge przed verdykt upgrade
  challenge?: {
    nonce: string;
    iterations: number;
  };
}

export interface ClientSignals {
  // Browser environment
  webdriver: boolean;
  pluginsCount: number;
  languages: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  maxTouchPoints: number;
  // GPU / Audio / Canvas
  webglRenderer: string | null;
  webglVendor: string | null;
  canvasHash: string | null;
  audioFingerprint: string | null;
  // Screen consistency
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  colorDepth: number;
  devicePixelRatio: number;
  // Time / locale
  timezone: string;
  timezoneOffset: number;
  // Browser features
  hasChrome: boolean;
  permissionsAnomaly: boolean;
  // Storage availability matrix
  hasIndexedDB: boolean;
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  hasCookiesEnabled: boolean;
  // Font enumeration (text-measure)
  detectedFonts: string[];
  // WebRTC IP leak (anti-VPN)
  rtcLocalIps: string[];
  // Browser API presence
  speechVoicesCount: number;
  hasGamepadApi: boolean;
  // Behavior
  mouseEntropy: number;
  mouseJerk: number;
  scrollCount: number;
  keyboardCount: number;
  clickTimingVariance: number;
  pointermoveCount: number;
  msToFirstInteraction: number | null;
  tg: boolean;
  // Challenge response (if Worker requested)
  challengeProof?: string;
  challengeNonce?: string;
}

// Minimal public state injected by edge — no reasons/scores/weights leak.
export interface PublicState {
  c: Classification;
  r: string;
  h: { nonce: string; iterations: number } | null;
}

declare global {
  interface Window {
    __INITIAL_STATE__?: PublicState;
  }
}
