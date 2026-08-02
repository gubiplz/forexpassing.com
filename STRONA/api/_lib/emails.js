// Transactional emails sent after the application questionnaire.
//
// Files under api/ that start with "_" are not routed by Vercel, so this is a
// plain module rather than an endpoint.
//
// Two emails, one per outcome:
//   qualified     — we are taking it on; here is what happens next
//   notQualified  — we are not, and here is what would change that
//
// Styled the way Apple writes transactional mail: a white sheet on light grey,
// one large quiet headline, generous space, hairline rules instead of boxes,
// a single pill button, and legal text small and grey at the bottom. Colour is
// used once — on the button — rather than as a banner.
//
// Inline-styled tables throughout, because that is the only layout email
// clients agree on: no flexbox, no grid, no external stylesheet.

const BRAND = 'Forex Passing';
const SITE = 'forexpassing.com';
const TELEGRAM = 'https://t.me/forexpassingadmin';
const CONTACT = 'contact@forexpassing.com';

// Where the logo is fetched from. The custom domain does not serve yet (its
// Vercel CNAME is behind Cloudflare's proxy), so this points at the deployment
// URL until that is sorted; then set PUBLIC_BASE_URL to https://forexpassing.com.
const ASSETS = process.env.PUBLIC_BASE_URL || 'https://forexpassing-com.vercel.app';

// Apple's neutral ramp, with our green as the one accent.
const PAGE = '#f5f5f7';
const SHEET = '#ffffff';
const INK = '#1d1d1f';
const SUBTLE = '#6e6e73';
const FAINT = '#86868b';
const HAIRLINE = '#d2d2d7';
const ACCENT = '#16a34a';

const FONT =
  "-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif";

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

function shell({ eyebrow, heading, intro, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:40px 16px;">
    <tr><td align="center">

      <table role="presentation" width="580" cellpadding="0" cellspacing="0"
        style="width:580px;max-width:100%;background:${SHEET};border-radius:18px;overflow:hidden;font-family:${FONT};">

        <!-- wordmark. The alt text is the fallback that matters: most clients
             block remote images by default, so this has to read as the brand
             name on its own. -->
        <tr><td align="center" style="padding:34px 40px 0;">
          <img src="${ASSETS}/logo-email.png" width="128" height="85" alt="${BRAND}"
            style="display:block;margin:0 auto;width:128px;height:auto;border:0;outline:none;text-decoration:none;font-size:13px;font-weight:600;color:${INK};" />
        </td></tr>

        <!-- headline -->
        <tr><td align="center" style="padding:34px 40px 0;">
          ${
            eyebrow
              ? `<div style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${ACCENT};margin-bottom:12px;">${esc(eyebrow)}</div>`
              : ''
          }
          <h1 style="margin:0;color:${INK};font-size:34px;line-height:1.12;font-weight:600;letter-spacing:-.021em;">
            ${esc(heading)}
          </h1>
          ${
            intro
              ? `<p style="margin:16px 0 0;color:${SUBTLE};font-size:17px;line-height:1.5;">${intro}</p>`
              : ''
          }
        </td></tr>

        <!-- body -->
        <tr><td style="padding:32px 40px 40px;color:${INK};font-size:17px;line-height:1.55;">
          ${body}
        </td></tr>

      </table>

      <!-- footer, outside the sheet, the way Apple sets it -->
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="width:580px;max-width:100%;font-family:${FONT};">
        <tr><td align="center" style="padding:22px 24px 8px;color:${FAINT};font-size:12px;line-height:1.6;">
          ${BRAND} &nbsp;·&nbsp; <a href="https://${SITE}" style="color:${FAINT};text-decoration:none;">${SITE}</a>
          &nbsp;·&nbsp; <a href="mailto:${CONTACT}" style="color:${FAINT};text-decoration:none;">${CONTACT}</a>
        </td></tr>
        <tr><td align="center" style="padding:0 24px 12px;color:${FAINT};font-size:11px;line-height:1.6;">
          Trading carries risk. A prop firm evaluation can fail and no outcome is guaranteed.
          Nothing here is investment advice.
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

/** Apple's pill button: solid accent, generous padding, no border. */
function button(label, href, color = ACCENT) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 0;">
    <tr><td align="center" style="background:${color};border-radius:980px;">
      <a href="${href}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-size:16px;font-weight:600;letter-spacing:-.01em;text-decoration:none;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

function hairline(space = 28) {
  return `<div style="height:1px;line-height:1px;font-size:0;background:${HAIRLINE};margin:${space}px 0;">&nbsp;</div>`;
}

/** A step: number in grey, title, one line of detail. Separated by hairlines. */
function step(n, title, desc, last = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="30" valign="top" style="padding-right:14px;color:${FAINT};font-size:15px;font-weight:600;padding-top:2px;">${n}</td>
      <td valign="top">
        <div style="color:${INK};font-size:17px;font-weight:600;letter-spacing:-.01em;">${title}</div>
        <div style="color:${SUBTLE};font-size:15px;line-height:1.5;margin-top:4px;">${desc}</div>
      </td>
    </tr>
  </table>${last ? '' : hairline(20)}`;
}

/* -------------------------------------------------------------------------- */

export function qualifiedEmail({ name }) {
  const body = `
    <p style="margin:0 0 26px;">Hey ${firstName(name)},</p>

    <p style="margin:0 0 30px;color:${SUBTLE};font-size:17px;line-height:1.55;">
      Your application has been accepted. Our desk is ready to run your prop firm evaluation and
      manage the funded account on your behalf.
    </p>

    ${hairline(0)}

    <div style="margin:28px 0 22px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${FAINT};">
      What happens next
    </div>

    ${step(1, 'Message us on Telegram', 'Onboarding happens there. Bring any questions — we answer them before anything is signed.')}
    ${step(2, 'We check your firm&rsquo;s rules', 'Before we touch anything we confirm the firm allows a third party to trade the account. If it does not, we say so.')}
    ${step(3, 'Agreement, then we trade', 'Risk limits and the split go in writing first. You keep 70% of every payout; we invoice 30% only once the money has reached you.', true)}

    ${hairline(30)}

    ${button('Open Telegram', TELEGRAM)}

    <p style="margin:18px 0 0;color:${FAINT};font-size:14px;line-height:1.5;text-align:center;">
      Someone from the team will reach out within one business day.
    </p>

    <p style="margin:26px 0 0;color:${FAINT};font-size:13px;line-height:1.6;">
      Nothing has been charged and nothing is owed. If you would rather talk over email, just reply
      to this message.
    </p>`;

  const text = [
    `Hey ${firstName(name)},`,
    '',
    'Your application has been accepted. Our desk is ready to run your prop firm',
    'evaluation and manage the funded account on your behalf.',
    '',
    'WHAT HAPPENS NEXT',
    '1. Message us on Telegram — onboarding happens there.',
    "2. We check your firm's rules before we touch anything.",
    '3. Agreement in writing, then we trade. You keep 70% of every payout;',
    '   we invoice 30% only once the money has reached you.',
    '',
    `Open Telegram: ${TELEGRAM}`,
    '',
    'Someone from the team will reach out within one business day.',
    'Nothing has been charged and nothing is owed.',
    '',
    `${BRAND} · https://${SITE} · ${CONTACT}`,
    'Trading carries risk. A prop firm evaluation can fail and no outcome is',
    'guaranteed. Nothing here is investment advice.',
  ].join('\n');

  return {
    subject: `Your ${BRAND} application was accepted`,
    text,
    html: shell({
      eyebrow: 'Application accepted',
      heading: 'You’re in.',
      intro: 'Here is what happens from here.',
      body,
    }),
  };
}

export function notQualifiedEmail({ name }) {
  const body = `
    <p style="margin:0 0 26px;">Hey ${firstName(name)},</p>

    <p style="margin:0 0 22px;color:${SUBTLE};font-size:17px;line-height:1.55;">
      Thank you for taking the time to fill in the application.
    </p>

    <p style="margin:0 0 30px;color:${SUBTLE};font-size:17px;line-height:1.55;">
      Based on your answers we are not taking this on right now. That is not a judgement on you as a
      trader — it usually comes down to timing, or to the account not being ready yet. We would
      rather say so than take your time.
    </p>

    ${hairline(0)}

    <div style="margin:28px 0 22px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${FAINT};">
      What usually changes the answer
    </div>

    ${step('—', 'You can fund an evaluation comfortably', 'Without stretching yourself or using money you need elsewhere.')}
    ${step('—', 'Your prop firm permits third-party trading', 'Some allow it under a written arrangement; others void results outright.')}
    ${step('—', 'You want to start in the next few weeks', 'Rather than at some undecided point later on.', true)}

    ${hairline(30)}

    <p style="margin:0 0 24px;color:${SUBTLE};font-size:17px;line-height:1.55;">
      If any of that changes, apply again or just message us — we will look at it with you. No hard
      feelings and no queue to rejoin.
    </p>

    ${button('Message us', TELEGRAM, '#1d1d1f')}

    <p style="margin:26px 0 0;color:${FAINT};font-size:13px;line-height:1.6;">
      Nothing has been charged and nothing is owed. You can reach us any time by replying to this
      message.
    </p>`;

  const text = [
    `Hey ${firstName(name)},`,
    '',
    'Thank you for taking the time to fill in the application.',
    '',
    'Based on your answers we are not taking this on right now. That is not a',
    'judgement on you as a trader — it usually comes down to timing, or to the',
    'account not being ready yet. We would rather say so than take your time.',
    '',
    'WHAT USUALLY CHANGES THE ANSWER',
    '- You can fund an evaluation comfortably.',
    '- Your prop firm permits third-party trading.',
    '- You want to start in the next few weeks.',
    '',
    `If any of that changes, apply again or message us: ${TELEGRAM}`,
    'Nothing has been charged and nothing is owed.',
    '',
    `${BRAND} · https://${SITE} · ${CONTACT}`,
    'Trading carries risk. A prop firm evaluation can fail and no outcome is',
    'guaranteed. Nothing here is investment advice.',
  ].join('\n');

  return {
    subject: `About your ${BRAND} application`,
    text,
    html: shell({
      eyebrow: 'Application reviewed',
      heading: 'Not this time.',
      intro: 'A straight answer, and what would change it.',
      body,
    }),
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
export async function sendEmail({ to, subject, html, text }) {
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
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        // A plain-text part is one of the strongest deliverability signals there
        // is: HTML-only mail scores badly with every major filter.
        text,
        reply_to: CONTACT,
        headers: {
          // Gmail and Yahoo expect these on anything they treat as bulk, and
          // they cost nothing on transactional mail.
          'List-Unsubscribe': `<mailto:${CONTACT}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
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
