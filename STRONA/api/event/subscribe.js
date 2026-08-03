// POST /api/event/subscribe — application form on the safe page.
//
// On Cloudflare this endpoint lives in workers/routes/event.ts and writes the
// lead to KV. Vercel has no Worker and no KV, so this function mirrors the same
// contract (honeypot + validation + {ok:true}) and forwards the lead to the
// LEAD_WEBHOOK env var.
//
// WITHOUT LEAD_WEBHOOK SET, THE LEAD IS ONLY WRITTEN TO THE FUNCTION LOG.
// Set LEAD_WEBHOOK in the Vercel project (e.g. a Make.com / Zapier hook) or
// applications will be visible in Vercel's runtime logs and nowhere else.

import { notQualifiedEmail, qualifiedEmail, sendEmail } from '../_lib/emails.js';
import { gradeLead } from '../_lib/lead-quality.js';
import { sendLeadToTelegram } from '../_lib/telegram.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  if (!body) {
    res.status(400).json({ error: 'invalid JSON' });
    return;
  }

  // Honeypot — real users never fill the hidden `company` field. Bots do.
  // Answer as if it worked so the bot has nothing to learn, and drop it.
  if (str(body.company)) {
    res.status(200).json({ ok: true });
    return;
  }

  // Field set matches workers/routes/event.ts. The safe-page form only sends
  // name/email/experience/goal, so the questionnaire-only fields default to ''.
  const lead = {
    ts: Date.now(),
    name: str(body.name).slice(0, 120),
    email: str(body.email).slice(0, 200),
    phone: str(body.phone).slice(0, 40),
    country: str(body.country).slice(0, 80),
    propFirm: str(body.propFirm).slice(0, 80),
    accountSize: str(body.accountSize).slice(0, 40),
    stage: str(body.stage).slice(0, 40),
    // Partner slug parked by /r/<slug>. Empty for direct traffic.
    ref: str(body.ref).slice(0, 40),
    telegram: str(body.telegram).slice(0, 60),
    // Every question/answer pair, so the team reads the whole picture.
    answers:
      body.answers && typeof body.answers === 'object'
        ? Object.fromEntries(
            Object.entries(body.answers)
              .slice(0, 30)
              .map(([q, a]) => [String(q).slice(0, 160), str(a).slice(0, 120)])
          )
        : {},
    experience: str(body.experience).slice(0, 40),
    goal: str(body.goal).slice(0, 2000),
    source: str(body.source).slice(0, 40) || 'safe',
    // 'qualified' | 'not_qualified'. The questionnaire sends both; the safe-page
    // form has no qualification step, so it defaults to qualified.
    outcome: body.outcome === 'not_qualified' ? 'not_qualified' : 'qualified',
    ip: req.headers['x-forwarded-for'] || '',
    ua: (req.headers['user-agent'] || '').slice(0, 200),
  };

  if (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
    res.status(400).json({ error: 'invalid' });
    return;
  }

  // Graded once, here, so the channel post, the webhook and the function log
  // all carry the same verdict instead of each consumer working it out again.
  // A rejected applicant is not scored: the grade only ranks people we want.
  lead.quality = lead.outcome === 'qualified' ? gradeLead(lead) : null;

  // Always log — this is the only record when no webhook is configured.
  console.log('[lead]', JSON.stringify(lead));

  if (process.env.LEAD_WEBHOOK) {
    try {
      await fetch(process.env.LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Delivery is best-effort; the lead is already in the log above.
      console.error('[lead] webhook failed', err);
    }
  }

  // Channel post and confirmation email go out together rather than one after
  // the other: they are independent, and running them in sequence made the
  // applicant wait for both. Both are best-effort — the lead is already logged
  // and forwarded above, so neither may turn a captured application into a 500
  // for the person who just filled the form in.
  const mail =
    lead.outcome === 'qualified'
      ? qualifiedEmail({ name: lead.name })
      : notQualifiedEmail({ name: lead.name });

  const [posted, sent] = await Promise.all([
    sendLeadToTelegram(lead),
    sendEmail({ to: lead.email, subject: mail.subject, html: mail.html, text: mail.text }),
  ]);
  console.log('[lead]', lead.outcome, 'telegram:', posted, 'email:', sent);

  res.status(200).json({ ok: true });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
