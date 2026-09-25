// Tracked referral link: /r/<slug>
//
// Records the click and sends the visitor to the offer page with the referrer
// attached, so a lead can be credited later. The click goes through the
// record_click() function with the same public anon key the portal uses:
// referral_clicks itself has RLS on and no policies, so nothing can read it
// row by row, and the function only appends a click for a partner that exists.
// That keeps the service-role key out of Vercel altogether.
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

  // The same two variables the portal is built with; Vercel exposes them to
  // functions as well.
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/record_click`, {
        method: 'POST',
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          p_slug: slug,
          p_ua: String(req.headers['user-agent'] ?? '').slice(0, 400),
          p_referrer: String(req.headers.referer ?? '').slice(0, 400),
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
