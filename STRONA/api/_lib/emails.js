// Transactional emails sent after the application questionnaire.
//
// Files under api/ that start with "_" are not routed by Vercel, so this is a
// plain module rather than an endpoint.
//
// Two emails, one per outcome:
//   qualified     — we are taking it on; here is what happens next
//   notQualified  — we are not, and here is what would change that
//
// Written as inline-styled tables because that is the only layout email clients
// agree on: no flexbox, no grid, no external stylesheet. Dark background with a
// coloured header band, which is what the reference funnel sends.

const BRAND = 'Forex Passing';
const SITE = 'forexpassing.com';
const TELEGRAM = 'https://t.me/forexpassingadmin';
const CONTACT = 'contact@forexpassing.com';

const GREEN = '#16a34a';
const INK = '#0b0f0d';
const PANEL = '#121815';
const TEXT = '#e6efea';
const MUTED = '#8fa098';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** First name only — "Hey Bartholomew Kowalski," reads like a bank letter. */
function firstName(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0];
  return first ? esc(first) : 'there';
}

function shell({ headerColor, emoji, heading, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f3;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border-radius:14px;overflow:hidden;background:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <tr><td align="center" style="background:${headerColor};padding:38px 28px 34px;">
          <div style="font-size:38px;line-height:1;margin-bottom:14px;">${emoji}</div>
          <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;font-weight:800;letter-spacing:.01em;text-transform:uppercase;">
            ${esc(heading)}
          </h1>
        </td></tr>

        <tr><td style="padding:32px 32px 28px;color:${TEXT};font-size:15px;line-height:1.65;">
          ${body}
        </td></tr>

        <tr><td align="center" style="background:#080b0a;padding:18px 24px;color:${MUTED};font-size:12px;">
          ${BRAND} — <a href="https://${SITE}" style="color:${MUTED};text-decoration:none;">${SITE}</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label, href, color = GREEN) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 8px;">
    <tr><td align="center" style="background:${color};border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:.02em;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

function step(n, title, desc) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td width="34" valign="top" style="padding-right:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="center" width="28" height="28" style="background:${GREEN};border-radius:14px;color:#ffffff;font-size:13px;font-weight:800;">${n}</td>
        </tr></table>
      </td>
      <td valign="top">
        <div style="color:${TEXT};font-size:15px;font-weight:700;">${title}</div>
        <div style="color:${MUTED};font-size:13.5px;line-height:1.55;margin-top:2px;">${desc}</div>
      </td>
    </tr>
  </table>`;
}

/* -------------------------------------------------------------------------- */

export function qualifiedEmail({ name }) {
  const body = `
    <p style="margin:0 0 16px;">Hey <strong style="color:#ffffff;">${firstName(name)}</strong>,</p>

    <p style="margin:0 0 16px;">
      Good news — your application has been <strong style="color:${GREEN};">accepted</strong>.
      Our desk is ready to run your prop firm evaluation and manage the funded account on your behalf.
    </p>

    <p style="margin:0 0 18px;">Here's what happens next:</p>

    ${step(1, 'Message us on Telegram', 'That is where onboarding happens. Bring any questions — we answer them before anything is signed.')}
    ${step(2, 'We check your firm&rsquo;s rules', 'Before we touch anything we confirm the firm allows a third party to trade the account. If it does not, we say so.')}
    ${step(3, 'Agreement, then we trade', 'Risk limits and the split go in writing first. You keep 70% of every payout and we invoice 30% only after the money has reached you.')}

    ${button('JOIN TELEGRAM NOW &rarr;', TELEGRAM)}

    <p style="margin:20px 0 0;color:${MUTED};font-size:13px;text-align:center;">
      Someone from the team will reach out within one business day.
    </p>

    <p style="margin:20px 0 0;color:${MUTED};font-size:12.5px;line-height:1.6;">
      Nothing has been charged and nothing is owed. Trading carries risk: an evaluation can fail and
      no outcome is guaranteed. Questions? Just reply, or write to
      <a href="mailto:${CONTACT}" style="color:${MUTED};">${CONTACT}</a>.
    </p>`;

  return {
    subject: `You're through — next steps for your ${BRAND} application`,
    html: shell({ headerColor: GREEN, emoji: '🎉', heading: 'You are qualified for our service!', body }),
  };
}

export function notQualifiedEmail({ name }) {
  const body = `
    <p style="margin:0 0 16px;">Hey <strong style="color:#ffffff;">${firstName(name)}</strong>,</p>

    <p style="margin:0 0 16px;">
      Thanks for taking the time to fill in the application — genuinely.
    </p>

    <p style="margin:0 0 16px;">
      Based on your answers we are <strong style="color:#ffffff;">not taking this on right now</strong>.
      That is not a judgement on you as a trader; it usually comes down to timing, or to the account
      not being ready yet. We would rather say so than take your time and your money.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr><td style="background:${PANEL};border-left:3px solid ${GREEN};border-radius:8px;padding:16px 18px;color:${MUTED};font-size:14px;line-height:1.7;">
        Things that usually change the answer:<br />
        &bull; You are ready to fund an evaluation without stretching yourself<br />
        &bull; Your prop firm allows a third party to trade the account<br />
        &bull; You want to start within the next few weeks, not "sometime"
      </td></tr>
    </table>

    <p style="margin:0 0 16px;">
      If any of that shifts, come back and apply again — or just message us and we will look at it
      with you. No hard feelings and no queue to rejoin.
    </p>

    ${button('MESSAGE US ON TELEGRAM &rarr;', TELEGRAM, '#1f2a25')}

    <p style="margin:20px 0 0;color:${MUTED};font-size:12.5px;line-height:1.6;">
      Nothing has been charged and nothing is owed. Trading carries risk: an evaluation can fail and
      no outcome is guaranteed. You can reach us any time at
      <a href="mailto:${CONTACT}" style="color:${MUTED};">${CONTACT}</a>.
    </p>`;

  return {
    subject: `About your ${BRAND} application`,
    html: shell({ headerColor: '#1f2a25', emoji: '📩', heading: 'Thanks for applying', body }),
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Sends one email through Resend.
 *
 * Returns false and logs instead of throwing: the application itself has
 * already been recorded by the time this runs, and a mail outage must never
 * turn a captured lead into a 500 for the person who just applied.
 */
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping', subject);
    return false;
  }

  // The domain has to be verified in Resend before this address will send.
  // Until then set RESEND_FROM to onboarding@resend.dev, which only delivers
  // to the Resend account owner — enough to test the flow end to end.
  const from = process.env.RESEND_FROM || `${BRAND} <noreply@${SITE}>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: CONTACT }),
    });
    if (!res.ok) {
      console.error('[email] resend rejected', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] send failed', err);
    return false;
  }
}
