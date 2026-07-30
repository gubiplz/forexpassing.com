// CSRF token chain — server-issued, mirrored in <meta name="csrf"> and cookie,
// echoed back in X-Csrf-Token header on POST /api/event. Prevents replay from
// scrapers that scrape one session and replay against another.

const COOKIE = '__csrf';

export async function mintCsrf(secret: string, requestId: string): Promise<string> {
  const ts = Date.now().toString(36);
  const payload = `${requestId}.${ts}`;
  const sig = await hmacShort(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyCsrf(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [requestId, ts, sigClaimed] = parts;
  const ageMs = Date.now() - parseInt(ts, 36);
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > 3_600_000) return false;
  const sigExpected = await hmacShort(secret, `${requestId}.${ts}`);
  if (sigClaimed.length !== sigExpected.length) return false;
  let diff = 0;
  for (let i = 0; i < sigClaimed.length; i++) {
    diff |= sigClaimed.charCodeAt(i) ^ sigExpected.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacShort(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret + ':csrf'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  let s = '';
  for (const b of new Uint8Array(sig)) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '').slice(0, 16);
}

export function buildCsrfCookie(token: string): string {
  return `${COOKIE}=${token}; Max-Age=3600; Path=/; Secure; SameSite=Strict`;
}

export function readCsrfCookie(headers: Headers): string | null {
  const raw = headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === COOKIE) return part.slice(eq + 1).trim();
  }
  return null;
}
