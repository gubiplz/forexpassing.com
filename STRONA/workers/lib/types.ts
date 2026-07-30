// Shared types for edge runtime.

export type Classification = 'human' | 'reviewer' | 'bot' | 'suspicious' | 'unknown';

export type ReasonCode =
  | 'asn_meta' | 'asn_google' | 'asn_datacenter' | 'asn_security_vendor' | 'asn_vpn'
  | 'residential_asn'
  | 'cf_bot_score_high' | 'cf_bot_score_low' | 'cf_verified_bot'
  | 'ua_meta_bot' | 'ua_google_bot' | 'ua_security_scanner' | 'ua_seo_scraper'
  | 'ua_headless' | 'ua_http_library' | 'ua_generic_bot'
  | 'ua_empty' | 'ua_too_short' | 'ua_no_mozilla' | 'ua_ok'
  | 'missing_client_hints' | 'client_hints_ok'
  | 'tls_automation_tool' | 'tls_browser_match' | 'tls_unknown' | 'http_protocol_old'
  | 'fbclid_first_use' | 'fbclid_already_used' | 'gclid_first_use' | 'gclid_already_used'
  | 'ttclid_first_use' | 'ttclid_already_used'
  | 'no_paid_traffic_param' | 'trusted_cookie_valid' | 'trusted_cookie_invalid'
  | 'sw_verified_header'
  | 'csrf_valid' | 'csrf_invalid' | 'csrf_missing'
  | 'challenge_solved' | 'challenge_failed' | 'challenge_missing'
  | 'geo_pl' | 'geo_blocked_country' | 'tz_country_mismatch'
  | 'webdriver_true' | 'no_plugins' | 'no_languages'
  | 'webgl_swiftshader' | 'canvas_headless_hash' | 'permissions_anomaly'
  | 'missing_chrome_obj' | 'touch_ua_mismatch'
  | 'storage_disabled' | 'fonts_headless_pattern' | 'speech_voices_empty'
  | 'rtc_no_local_ip' | 'rtc_localhost_only'
  | 'no_mouse_movement' | 'mouse_entropy_low' | 'mouse_entropy_human'
  | 'mouse_jerk_robotic' | 'click_timing_uniform'
  | 'too_fast_scroll' | 'honeypot_triggered'
  | 'header_order_atypical' | 'accept_language_missing'
  | 'no_origin_state'
  | 'funnel_with_click'
  | 'funnel_no_click';

export interface ReasonEntry {
  code: ReasonCode;
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
  csrf?: string;
  challenge?: { nonce: string; iterations: number };
}

export interface ClientSignals {
  webdriver: boolean;
  pluginsCount: number;
  languages: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  maxTouchPoints: number;
  webglRenderer: string | null;
  webglVendor: string | null;
  canvasHash: string | null;
  audioFingerprint: string | null;
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  colorDepth: number;
  devicePixelRatio: number;
  timezone: string;
  timezoneOffset: number;
  hasChrome: boolean;
  permissionsAnomaly: boolean;
  hasIndexedDB: boolean;
  hasLocalStorage: boolean;
  hasSessionStorage: boolean;
  hasCookiesEnabled: boolean;
  detectedFonts: string[];
  rtcLocalIps: string[];
  speechVoicesCount: number;
  hasGamepadApi: boolean;
  mouseEntropy: number;
  mouseJerk: number;
  scrollCount: number;
  keyboardCount: number;
  clickTimingVariance: number;
  pointermoveCount: number;
  msToFirstInteraction: number | null;
  tg: boolean;
  challengeProof?: string;
  challengeNonce?: string;
}

export interface Env {
  USED_CLICKS: KVNamespace;
  EDGE_LOG: KVNamespace;
  STATS?: D1Database;
  EDGE_SECRET: string;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  ORIGIN_URL?: string;
  LEAD_WEBHOOK?: string;
}

export interface CfProperties {
  asn?: number;
  asOrganization?: string;
  country?: string;
  city?: string;
  continent?: string;
  timezone?: string;
  tlsVersion?: string;
  tlsCipher?: string;
  tlsClientHelloLength?: number;
  httpProtocol?: string;
  botManagement?: {
    score?: number;
    verifiedBot?: boolean;
    corporateProxy?: boolean;
  };
}
