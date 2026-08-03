// Posts each application into the team's Telegram channel.
//
// Needs two env vars in the Vercel project:
//   TELEGRAM_BOT_TOKEN — from @BotFather
//   TELEGRAM_CHAT_ID   — the channel id, e.g. -1001234567890
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
    ['Source', lead.source],
  ].filter(([, v]) => v);

  const lines = rejected
    ? ['🔴 <b>Not qualified</b>']
    : [`${q.emoji} <b>${q.label}</b> · ${q.score}/${q.max}`, '🟢 Qualified'];

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
  // cheapest way to pull up every hot lead without a CRM.
  lines.push('', rejected ? '#lead_out' : q.tag);

  const text = lines.join('\n');
  return text.length > MAX ? `${text.slice(0, MAX)}\n…` : text;
}

/**
 * Best-effort delivery: the lead is already logged and emailed by the time this
 * runs, so a Telegram outage must never fail the request for the person who
 * just applied.
 */
export async function sendLeadToTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping');
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
