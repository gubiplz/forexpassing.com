// JS Proof-of-Work challenge — issued for `suspicious` verdicts.
// Client solves N iterations of SHA-256 hash chain, server verifies.
//
// Stateless design: nonce format is `nonce.ts.sig` where sig = HMAC(secret, nonce.ts.requestId)
// — server can verify integrity without storing the nonce in KV. TTL = 120s.

import type { Verdict, Env } from './types.ts';

const ITERATIONS = 5_000;
const TTL_MS = 120_000;

export function shouldIssueChallenge(score: number, hasCookie: boolean): boolean {
  if (hasCookie) return false;
  return score >= -10 && score < 30;
}

export async function buildChallenge(
  env: Env,
  requestId: string
): Promise<NonNullable<Verdict['challenge']>> {
  const nonce = randomB64(24);
  const ts = Date.now().toString(36);
  const sig = (await hmac(env.EDGE_SECRET, `${nonce}.${ts}.${requestId}`)).slice(0, 16);
  return {
    nonce: `${nonce}.${ts}.${sig}`,
    iterations: ITERATIONS,
  };
}

export async function verifyChallenge(
  env: Env,
  requestId: string,
  challengeNonce: string | undefined,
  proof: string | undefined
): Promise<boolean> {
  if (!challengeNonce || !proof) return false;
  const parts = challengeNonce.split('.');
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;

  // Timestamp freshness
  const issued = parseInt(ts, 36);
  if (Number.isNaN(issued) || Date.now() - issued > TTL_MS) return false;

  // Nonce signature integrity — proves we issued it
  const expectedSig = (await hmac(env.EDGE_SECRET, `${nonce}.${ts}.${requestId}`)).slice(0, 16);
  if (!ctEq(sig, expectedSig)) return false;

  // Recompute proof from nonce; compare with what client sent
  const expectedProof = await computeProof(nonce, ITERATIONS);
  return ctEq(expectedProof, proof);
}

async function computeProof(nonce: string, iterations: number): Promise<string> {
  let chain = nonce;
  const enc = new TextEncoder();
  for (let i = 0; i < iterations; i++) {
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(chain + i));
    chain = base64Url(new Uint8Array(digest));
  }
  return chain;
}

async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return base64Url(new Uint8Array(sig));
}

function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function randomB64(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return base64Url(bytes).slice(0, len);
}

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
