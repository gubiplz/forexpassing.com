// Tracked referral link: /r/<slug>
//
// Records the click and sends the visitor to the offer page with the referrer
// attached, so a lead can be credited later. The click is written with the
// service-role key — referral_clicks has RLS on and no policies, so nothing in
// the browser can read or forge it.
//
// The redirect happens whether or not the write succeeds. A partner's link
// must never break because the database is having a bad day.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,31}$/;

export default async function handler(req, res) {
  const raw = req.query?.slug;
  const slug = String(Array.isArray(raw) ? raw[0] : (raw ?? '')).toLowerCase();

  if (!SLUG_RE.test(slug)) {
    res.setHeader('Location', '/meta');
    res.status(302).end();
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      await fetch(`${url.replace(/\/$/, '')}/rest/v1/referral_clicks`, {
        method: 'POST',
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          slug,
          ua: String(req.headers['user-agent'] ?? '').slice(0, 400),
          referrer: String(req.headers.referer ?? '').slice(0, 400),
        }),
        // Krótszy niż gdziekolwiek indziej w repo: klient czeka na redirect,
        // więc wisząca baza nie może go trzymać dłużej niż mrugnięcie.
        signal: AbortSignal.timeout(1500),
      });
    } catch (err) {
      console.error('[r] click not recorded', err);
    }
  }

  res.setHeader('Location', `/meta?ref=${encodeURIComponent(slug)}`);
  res.setHeader('cache-control', 'no-store');
  res.status(302).end();
}
