// Posts each application into the team's Telegram channel.
//
// Needs two env vars in the Vercel project:
//   TELEGRAM_BOT_TOKEN     — from @BotFather
//   TELEGRAM_LEADS_CHAT_ID — the desk chat id, e.g. -1001234567890
//
// A third is optional:
//   TELEGRAM_FREE_LEADS_CHAT_ID — where /freeaccount leads go instead
//
// The two offers are costed differently and worked by different people, so the
// owner wanted them in separate chats. Unset, free leads land in the desk chat
// alongside the paid ones, which is what happened before this split existed.
//
// The name says "leads" on purpose. This post carries a name, an e-mail and a
// phone number, so it may only ever reach the private desk — and a variable
// called TELEGRAM_CHAT_ID is exactly the one somebody points at a public
// channel, or deletes to silence something unrelated. Both happened.
//
// Getting the chat id: create the bot with @BotFather, add it to the channel as
// an administrator (it needs "post messages"), send any message in the channel,
// then open
//   https://api.telegram.org/bot<TOKEN>/getUpdates
// and read `channel_post.chat.id`. A private channel's invite link (t.me/+…)
// does not contain the id, so this step cannot be skipped.
//
// Without both vars set this is a no-op: the lead is still logged and emailed.

import { gradeLead } from './lead-quality.js';

const MAX = 3900; // Telegram caps a message at 4096 characters.

// This is awaited before the form answers, so the wait is not the notification's
// to spend — it belongs to the person watching a spinner. A Telegram that stops
// answering, rather than refusing, would otherwise hold the response until the
// platform kills the whole function, taking the sheet row and the thank-you
// redirect down with it. Six seconds is longer than this call has ever needed.
const TIMEOUT_MS = 6000;

/** The /freeaccount funnel opens the questionnaire with source "free". */
const isFreeLead = (lead) => String(lead.source ?? '').startsWith('free');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * One lead as a readable channel post.
 *
 * The first line is the grade, because that is the line Telegram puts in the
 * channel list: a hot lead has to be recognisable before the message is opened.
 * The grade is normally computed once in the endpoint and passed in on
 * `lead.quality`; it is recomputed here when it is missing so this function
 * still works on its own.
 */
export function formatLead(lead) {
  const rejected = lead.outcome === 'not_qualified';
  const q = rejected ? null : lead.quality ?? gradeLead(lead);

  // That offer is run and costed differently from the paid funnel, so its leads
  // are called out — on the first line, so it shows in the channel preview
  // without opening, in the Source row, and as a searchable tag. The badge stays
  // useful even with a chat of their own: nothing stops a paid lead landing
  // there once TELEGRAM_FREE_LEADS_CHAT_ID is unset or points at the same chat.
  const fromFree = isFreeLead(lead);
  const freeBadge = fromFree ? ' · 🆓 FREE CHALLENGE' : '';
  const sourceLabel = fromFree ? 'FREE CHALLENGE (/freeaccount)' : lead.source;

  // A number with no dialling code in front of it is not dialable, and the one
  // thing worse than not having it is thinking you do. Say so on the row.
  const phone = lead.phone
    ? String(lead.phone).startsWith('+')
      ? lead.phone
      : `${lead.phone} (no country code)`
    : '';

  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Telegram', lead.telegram],
    ['Phone', phone],
    ['Referred by', lead.ref],
    ['Source', sourceLabel],
  ].filter(([, v]) => v);

  const lines = rejected
    ? [`🔴 <b>Not qualified</b>${freeBadge}`]
    : [`${q.emoji} <b>${q.label}</b> · ${q.score}/${q.max}${freeBadge}`, '🟢 Qualified'];

  lines.push('', ...rows.map(([k, v]) => `<b>${k}:</b> ${esc(v)}`));

  // The score shows its working, so nobody has to trust a bare number.
  if (q?.reasons.length) lines.push('', `<b>Why:</b> ${esc(q.reasons.join(' · '))}`);
  if (q?.gaps.length) lines.push(`<b>Gaps:</b> ${esc(q.gaps.join(' · '))}`);
  // What the form accepted but nobody should take at face value. Its own line,
  // because this is the one that decides whether the contact details are worth
  // acting on at all.
  if (q?.penalties.length) lines.push(`⚠️ <b>Check:</b> ${esc(q.penalties.join(' · '))}`);

  const answers = Object.entries(lead.answers ?? {});
  if (answers.length) {
    lines.push('', '<b>Answers</b>');
    for (const [q2, a] of answers) lines.push(`• ${esc(q2)}\n   → <b>${esc(a)}</b>`);
  }

  // Tapping the tag in Telegram searches the channel for it, which is the
  // cheapest way to pull up every hot lead without a CRM. The free-challenge tag
  // rides on the same line so one search pulls every free-account applicant.
  lines.push(
    '',
    [rejected ? '#lead_out' : q.tag, fromFree ? '#free_challenge' : ''].filter(Boolean).join(' '),
  );

  const text = lines.join('\n');
  return text.length > MAX ? `${text.slice(0, MAX)}\n…` : text;
}

/**
 * Best-effort delivery: the lead is already in the function log by the time this
 * runs, so a Telegram outage must never fail the request for the person who
 * just applied. The sheet row, the email and the PTF forward run alongside this
 * one rather than after it, so none of them is waiting on the result either.
 */
export async function sendLeadToTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = isFreeLead(lead)
    ? process.env.TELEGRAM_FREE_LEADS_CHAT_ID || process.env.TELEGRAM_LEADS_CHAT_ID
    : process.env.TELEGRAM_LEADS_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_LEADS_CHAT_ID not set — skipping');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatLead(lead),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[telegram] rejected', res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[telegram] send failed', err);
    return false;
  }
}
