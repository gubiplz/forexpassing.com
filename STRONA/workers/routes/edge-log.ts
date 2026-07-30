// GET /api/__edge/log — recent classifications. Auth-gated by Bearer EDGE_SECRET.
// Without auth, returns 404 (looks like the endpoint doesn't exist).

import type { Env } from '../lib/types.ts';
import { readLog } from '../lib/log.ts';

export async function handleEdgeLog(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${env.EDGE_SECRET}`) {
    // Do not reveal the endpoint exists
    return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
  }
  const entries = await readLog(env, 50);
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
