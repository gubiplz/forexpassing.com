// Read-only probe: czy tokeny z sekretów repo nadal działają i jakie prawa
// mają boty na kanałach Forex Passing. Nic nie publikuje, niczego nie zmienia.
//
//   TELEGRAM_BOT_TOKEN=… TELEGRAM_TRACK_BOT_TOKEN=… node bin/probe-telegram-admin.mjs
//
// Tokenów NIE wolno logować. GitHub maskuje sekrety, ale i tak wycinamy je ze
// stringów — ten sam kontrakt co bin/sync-telegram-spots.mjs.

const CHATS = [
  '@fx_passing',
  '@fx_passingpayouts',
  '@fx_passingtrackrecord',
  '@FX_Passing_free',
  // historyczne id z logów CI / send.js — czy stare czaty jeszcze istnieją
  '-1004330892796', // @fx_passing z 6 sierpnia
  '-1004435320621', // payouts z tg-graphics/send.js
  '-1004452710375', // track record z dzisiejszego getChat
];

const BOTS = [
  ['TELEGRAM_BOT_TOKEN', process.env.TELEGRAM_BOT_TOKEN],
  ['TELEGRAM_TRACK_BOT_TOKEN', process.env.TELEGRAM_TRACK_BOT_TOKEN],
];

const PRAWA = [
  'can_post_messages',
  'can_edit_messages',
  'can_delete_messages',
  'can_change_info',
  'can_invite_users',
  'can_promote_members',
  'can_restrict_members',
  'can_pin_messages',
  'can_manage_chat',
  'can_manage_video_chats',
  'is_anonymous',
];

const scrubAll = (s, tokens) => {
  let out = String(s ?? '');
  for (const t of tokens) {
    if (t) out = out.split(t).join('<TOKEN>');
  }
  return out;
};

async function tg(token, method, params) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params ?? {}),
  });
  const body = await res.json().catch(() => ({}));
  return { http: res.status, ok: !!body.ok, description: body.description, result: body.result };
}

function prawa(member) {
  const out = {};
  for (const k of PRAWA) {
    if (member && k in member) out[k] = member[k];
  }
  return out;
}

function kto(user) {
  if (!user) return '(brak)';
  const nick = user.username ? `@${user.username}` : '';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return `${nick || name || '—'} id=${user.id}${user.is_bot ? ' (bot)' : ''}`;
}

const tokens = BOTS.map(([, t]) => t).filter(Boolean);

console.log('== probe telegram admin (read-only) ==');

for (const [name, token] of BOTS) {
  console.log(`\n######## ${name} ${token ? 'obecny' : 'BRAK'} ########`);
  if (!token) continue;

  const me = await tg(token, 'getMe', {});
  if (!me.ok) {
    console.log(`getMe: FAIL http=${me.http} ${scrubAll(me.description, tokens)}`);
    continue;
  }
  const bot = me.result;
  console.log(`getMe: OK ${kto(bot)}`);

  for (const chat of CHATS) {
    console.log(`\n-- ${chat} --`);
    const info = await tg(token, 'getChat', { chat_id: chat });
    if (!info.ok) {
      console.log(`getChat: FAIL ${scrubAll(info.description, tokens)}`);
    } else {
      const c = info.result;
      console.log(
        `getChat: ${c.title || c.first_name || '—'} type=${c.type} id=${c.id}` +
          (c.username ? ` @${c.username}` : ''),
      );
    }

    const member = await tg(token, 'getChatMember', {
      chat_id: chat,
      user_id: bot.id,
    });
    if (!member.ok) {
      console.log(`getChatMember(self): FAIL ${scrubAll(member.description, tokens)}`);
    } else {
      const m = member.result;
      console.log(`bot status: ${m.status}`);
      console.log('bot rights:', JSON.stringify(prawa(m)));
    }

    const count = await tg(token, 'getChatMemberCount', { chat_id: chat });
    if (!count.ok) {
      console.log(`getChatMemberCount: FAIL ${scrubAll(count.description, tokens)}`);
    } else {
      console.log(`getChatMemberCount: ${count.result}`);
    }

    const admins = await tg(token, 'getChatAdministrators', { chat_id: chat });
    if (!admins.ok) {
      console.log(`getChatAdministrators: FAIL ${scrubAll(admins.description, tokens)}`);
    } else {
      const lista = admins.result || [];
      console.log(`admins (${lista.length}):`);
      for (const a of lista) {
        console.log(
          `  - ${a.status} ${kto(a.user)} promote=${a.can_promote_members === true}`,
        );
      }
    }
  }
}

console.log('\n== koniec ==');
