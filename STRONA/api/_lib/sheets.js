// Files every application in the team's Google Sheet.
//
// The Telegram channel is the notification — it says a lead arrived, and it is
// good at that. It is not a record: nothing there sorts by score, filters to
// this week, or keeps a note about who called whom. That is what the sheet is
// for, so each application goes to both and neither depends on the other.
//
// Four env vars in the Vercel project:
//   GOOGLE_SA_EMAIL   — service account address, …@….iam.gserviceaccount.com
//   GOOGLE_SA_KEY     — the "private_key" value out of its JSON key file
//   LEADS_SHEET_ID    — the id in the sheet URL: /spreadsheets/d/<THIS>/edit
//   LEADS_SHEET_GID   — the gid= in the same URL; optional, and defaults to the
//                       "Obsługa-leadów" tab this was written against
//
// The sheet also has to be shared with GOOGLE_SA_EMAIL as an Editor. A service
// account is its own identity, not a delegate of whoever owns the sheet, so
// without that share every write comes back 403 no matter how correct the key
// is — which is why the error path below says so out loud.
//
// Without the first three vars this is a no-op, the same contract telegram.js
// keeps: an unconfigured deployment still logs, posts and emails the lead.

import { createSign } from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** The "Obsługa-leadów" tab. The other tab in that file is Koszty, and gid 0
 *  would be it, so this is deliberately not defaulted to zero. */
const DEFAULT_GID = 687993626;

// Both calls are made while somebody is waiting on the form's response, and
// they run alongside the Telegram post rather than after it. Google being slow
// must not be the reason an applicant sits watching a spinner.
const TIMEOUT_MS = 6000;

/**
 * The sheet's first twenty headers, in order.
 *
 * Columns to the right of these — status, opiekun, pierwszy_kontakt, notatki
 * and the rest — are the desk's own working columns. Nothing here writes to
 * them, so a note typed next to a lead stays where it was put. This list is the
 * only place the row order is written down, and a row that drifts out of step
 * with it is wrong in a way nothing complains about, so it is exported and
 * checked against the row builder rather than kept in a comment.
 */
export const HEADERS = [
  'data',
  'imie_nazwisko',
  'email',
  'telefon',
  'kraj_tel',
  'telegram',
  'q_wideo',
  'q_sam_kupuje',
  'q_doswiadczenie',
  'q_kiedy_kupuje',
  'outcome',
  'tier',
  'score',
  'plusy',
  'braki',
  'czerwone_flagi',
  'source',
  'ref',
  'ip',
  'answers_json',
];

// The answers arrive keyed by the question text, so the four question columns
// are filled by recognising the question rather than by its position — a step
// added or moved in src/data/questionnaire.ts then cannot shift the sheet one
// column sideways. Reword a question and its pattern has to move with it, the
// same trade lead-quality.js makes on the option labels. That is survivable
// here because answers_json carries the whole object regardless: a missed match
// costs a convenience column, never the answer itself.
const QUESTION_COLUMNS = [
  /watch the video/i,
  /buy the evaluation yourself/i,
  /what a prop firm evaluation is/i,
  /when do you want to buy/i,
];

const answerTo = (answers, re) => {
  const hit = Object.entries(answers ?? {}).find(([question]) => re.test(question));
  return hit ? hit[1] : '';
};

/**
 * Sortable, and in the timezone the desk actually works in: "2026-08-04 16:26:22".
 * Sorting a column of these as text puts them in chronological order, which a
 * localised date string would not.
 */
function stamp(ts, tz = process.env.LEADS_SHEET_TZ || 'Europe/Warsaw') {
  const d = new Date(ts);
  try {
    return d.toLocaleString('sv-SE', { timeZone: tz });
  } catch {
    // An unknown timezone name is not worth losing the row over.
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }
}

const join = (xs) => (Array.isArray(xs) ? xs.join(' · ') : '');

/**
 * One lead as the twenty values HEADERS describes, in that order.
 *
 * Pure, so the mapping can be tested without a network or a key.
 */
export function leadToRow(lead) {
  const answers = lead?.answers ?? {};
  // Only a qualified applicant is graded — subscribe.js sets quality to null
  // for the rest — so a rejected lead leaves the five scoring columns empty
  // instead of claiming a score of zero nobody gave it.
  const q = lead?.quality ?? null;

  return [
    stamp(lead?.ts ?? Date.now()),
    lead?.name ?? '',
    lead?.email ?? '',
    lead?.phone ?? '',
    lead?.phoneIso ?? '',
    lead?.telegram ?? '',
    ...QUESTION_COLUMNS.map((re) => answerTo(answers, re)),
    lead?.outcome ?? '',
    q ? q.tier : '',
    q ? q.score : '',
    q ? join(q.reasons) : '',
    q ? join(q.gaps) : '',
    q ? join(q.penalties) : '',
    lead?.source ?? '',
    lead?.ref ?? '',
    lead?.ip ?? '',
    Object.keys(answers).length ? JSON.stringify(answers) : '',
  ];
}

/**
 * A blank stays a genuinely empty cell rather than an empty string, so COUNTA
 * and the filter views read the way the desk expects. The score goes in as a
 * number, because a column of numbers stored as text sorts 10 before 9.
 */
const cell = (v) =>
  v === '' || v === null || v === undefined
    ? {}
    : {
        userEnteredValue:
          typeof v === 'number' ? { numberValue: v } : { stringValue: String(v) },
      };

/** Held between invocations while the function stays warm, so a busy hour does
 *  not mint a token per lead. */
let cachedToken = null;

/** Vercel's env editor stores one line, so the key's newlines normally arrive
 *  escaped; a pasted-in pair of quotes is just as common. Accept both. */
const pem = (raw) =>
  String(raw)
    .replace(/\\n/g, '\n')
    .replace(/^["']|["']$/g, '')
    .trim();

async function accessToken(email, key) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 });

  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${claim}`);
  const jwt = `${head}.${claim}.${signer.sign(pem(key)).toString('base64url')}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`token ${res.status} ${(await res.text()).slice(0, 200)}`);

  const { access_token: token, expires_in: ttl } = await res.json();
  cachedToken = { token, exp: now + (ttl ?? 3600) };
  return token;
}

/**
 * Best-effort, like the Telegram post: by the time this runs the lead is
 * already logged, forwarded and on its way to the channel, so a Google outage
 * must never turn a captured application into a 500 for the person who sent it.
 */
export async function appendLeadToSheet(lead) {
  const email = process.env.GOOGLE_SA_EMAIL;
  const key = process.env.GOOGLE_SA_KEY;
  const sheet = process.env.LEADS_SHEET_ID;
  if (!email || !key || !sheet) {
    console.warn('[sheets] GOOGLE_SA_EMAIL / GOOGLE_SA_KEY / LEADS_SHEET_ID not set — skipping');
    return false;
  }

  const gid = Number(process.env.LEADS_SHEET_GID ?? DEFAULT_GID);
  if (!Number.isInteger(gid)) {
    console.error('[sheets] LEADS_SHEET_GID is not a number:', process.env.LEADS_SHEET_GID);
    return false;
  }

  try {
    const token = await accessToken(email, key);

    // appendCells addresses the tab by its numeric gid. The alternative, an A1
    // range, needs the tab's name — which here is "Obsługa-leadów", so it would
    // have to survive quoting and URL-encoding, and would break the day someone
    // renames the tab. The gid never changes.
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}:batchUpdate`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              appendCells: {
                sheetId: gid,
                rows: [{ values: leadToRow(lead).map(cell) }],
                fields: 'userEnteredValue',
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      // A 403 here is nearly always the share rather than the key: the service
      // account has to be an Editor on the sheet in its own right.
      console.error('[sheets] rejected', res.status, (await res.text()).slice(0, 300));
      if (res.status === 401) cachedToken = null;
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sheets] append failed', err);
    cachedToken = null;
    return false;
  }
}
