// Cookie issuance — HMAC-signed primary + decoy cookies for camouflage.
// DevTools shows 4 cookies; only __sid carries verified state, others are
// indistinguishable from common CF / GA / app session cookies.

export const COOKIE_PRIMARY = '__sid';
const COOKIE_TTL_SECONDS = 86_400;

interface CookiePayload {
  iat: number;
  v: 1;
}

async function hmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64UrlBytes(new Uint8Array(sig));
}

function base64UrlBytes(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlEncode(str: string): string {
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(b64: string): string {
  const padded =
    b64.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

export async function issueTrustedCookie(secret: string): Promise<string> {
  const payload: CookiePayload = { iat: Date.now(), v: 1 };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyTrustedCookie(
  cookieValue: string,
  secret: string
): Promise<boolean> {
  const dot = cookieValue.indexOf('.');
  if (dot < 0) return false;
  const payloadB64 = cookieValue.slice(0, dot);
  const sigClaimed = cookieValue.slice(dot + 1);
  const sigExpected = await hmac(secret, payloadB64);
  if (sigClaimed.length !== sigExpected.length) return false;
  let diff = 0;
  for (let i = 0; i < sigClaimed.length; i++) {
    diff |= sigClaimed.charCodeAt(i) ^ sigExpected.charCodeAt(i);
  }
  if (diff !== 0) return false;
  try {
    const payload: CookiePayload = JSON.parse(base64UrlDecode(payloadB64));
    const ageMs = Date.now() - payload.iat;
    return ageMs >= 0 && ageMs <= COOKIE_TTL_SECONDS * 1000;
  } catch {
    return false;
  }
}

function cookieAttrs(): string {
  return `Max-Age=${COOKIE_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

// Builds Set-Cookie headers: primary signed + 3 plausible decoys.
// Naming matches real-world cookies a researcher would NOT immediately flag:
//   __cf_bm  — exact name of real Cloudflare Bot Management cookie
//   _ga_*    — GA4 format `_ga_<CONTAINER_ID>` with realistic value
//   ajs_anonymous_id — Segment Analytics format
export async function buildCookieHeaders(secret: string): Promise<string[]> {
  const primary = await issueTrustedCookie(secret);
  const cfBm = generateOpaqueToken(43);
  const ajsId = crypto.randomUUID();
  const gaContainer = 'GTH2QXLNVR'; // looks like real GA4 measurement container
  const gaSession = `GS1.1.${Math.floor(Date.now() / 1000)}.1.0.${Math.floor(Date.now() / 1000)}.0.0.0`;
  return [
    `${COOKIE_PRIMARY}=${primary}; ${cookieAttrs()}`,
    `__cf_bm=${cfBm}; Max-Age=1800; Path=/; HttpOnly; Secure; SameSite=None`,
    `ajs_anonymous_id=%22${ajsId}%22; Max-Age=${COOKIE_TTL_SECONDS * 365}; Path=/; Secure; SameSite=Lax`,
    `_ga_${gaContainer}=${gaSession}; Max-Age=${COOKIE_TTL_SECONDS * 730}; Path=/; Secure; SameSite=Lax`,
  ];
}

function generateOpaqueToken(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil((length * 3) / 4)));
  return base64UrlBytes(bytes).slice(0, length);
}

export async function buildRequestId(ip: string, ua: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlBytes(new Uint8Array(digest)).slice(0, 10);
}
