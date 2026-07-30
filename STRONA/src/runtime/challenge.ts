// Client-side challenge solver.
// Worker issues a challenge for `suspicious` verdicts. Solver does N iterations
// of HMAC-SHA-256 chaining (proof-of-work). Real browser CPU completes in ~150ms.
// Bot without JS engine fails; headless Chrome completes but leaves timing tells.

interface Challenge {
  nonce: string;
  iterations: number;
}

export async function solveChallenge(c: Challenge): Promise<string> {
  let chain = c.nonce;
  const encoder = new TextEncoder();
  // Iterate hash chain — proof of computational work
  for (let i = 0; i < c.iterations; i++) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(chain + i));
    chain = base64Url(new Uint8Array(digest));
  }
  return chain;
}

function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
