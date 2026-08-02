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

const MAX = 3900; // Telegram caps a message at 4096 characters.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** One lead as a readable channel post. */
export function formatLead(lead) {
  const head = lead.outcome === 'not_qualified' ? '🔴 Not qualified' : '🟢 Qualified';

  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Telegram', lead.telegram],
    ['Phone', lead.phone],
    ['Income', lead.income],
    ['Referred by', lead.ref],
    ['Source', lead.source],
  ].filter(([, v]) => v);

  const lines = [
    `<b>${head}</b>`,
    '',
    ...rows.map(([k, v]) => `<b>${k}:</b> ${esc(v)}`),
  ];

  const answers = Object.entries(lead.answers ?? {});
  if (answers.length) {
    lines.push('', '<b>Answers</b>');
    for (const [q, a] of answers) lines.push(`• ${esc(q)}\n   → <b>${esc(a)}</b>`);
  }

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
