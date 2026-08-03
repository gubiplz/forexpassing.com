// How good is this lead, in one line the desk can act on.
//
// The questionnaire asks four things, and three of them say something about
// whether the person turns into a funded account. Rather than make whoever is
// on the desk read the whole answer list on every post, the answers are scored
// here and the verdict goes on the first line of the Telegram message — which
// is also the line Telegram shows in the channel list, so a hot lead is visible
// without opening anything.
//
// The weights are set so that HIGH is unreachable without "Now" on the timing
// question. Buying now is worth 4 of the 9 points, the threshold is 7, and
// every other signal added together comes to 6 — so the best possible lead who
// is only buying "within a few weeks" tops out one point short. Stated plainly,
// a high-quality lead is someone buying now who also brings three points'
// worth of the rest. Buying now and nothing else lands in warm, which is the
// honest reading of it.
//
// The second half of this file is about the data itself. The form no longer
// blocks anyone over a phone number or a Telegram handle — an extra field that
// stops the form costs more applications than it saves bad records — so the
// junk that used to be argued with at the door now arrives, and gets judged
// here instead. Every penalty costs a point AND caps the lead at warm, because
// 🔥 means "message this one first" and nobody messages a two-digit phone
// number first.
//
// Matching is done on the answer text rather than the question text, because
// the answers are the distinctive part. Reword a question and this still works;
// reword an option label and the matching regex below has to move with it.

const MAX = 9;

const TIERS = {
  high: { emoji: '🔥', label: 'HIGH QUALITY LEAD', tag: '#lead_hot' },
  warm: { emoji: '🟡', label: 'Warm lead', tag: '#lead_warm' },
  cold: { emoji: '⚪️', label: 'Cold lead', tag: '#lead_cold' },
};

/** Lowercased, with typographic apostrophes folded onto the plain one. */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[’‘]/g, "'").trim();

const has = (answers, re) => Object.values(answers ?? {}).some((v) => re.test(norm(v)));

// Option labels from src/data/questionnaire.ts.
const BUYING_NOW = /^now$/;
const BUYING_WEEKS = /within a few weeks/;
const FAILED_BEFORE = /didn't pass/;
const DONE_BEFORE = /i've done one/; // "I've never done one" does not match this
const NEVER_DONE = /never done one/;
const WATCHED_ALL = /^yes, all of it/;
const WATCHED_PART = /only part of it/;

// Telegram allows 5–32 characters: letters, digits and underscores, and people
// type the leading @ either way. Moved here from the form, where it used to be
// a blocking check.
const TELEGRAM_RE = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;

// Digits in the national part, per country. A deliberate mirror of the min/max
// columns in src/data/dial-codes.ts — the API cannot import that file, which is
// TypeScript compiled for the browser bundle. If the two ever drift the only
// consequence is a scoring nudge on an unusual number; nothing here blocks a
// submission, so it is not worth a shared module and the deployment risk that
// comes with one. Countries absent from this table fall back to GENERIC.
const GENERIC = [6, 14];
const PHONE_DIGITS = {
  AL: [8, 9], DZ: [8, 9], AR: [10, 11], AU: [9, 9], AT: [7, 13], BH: [8, 8], BY: [9, 9],
  BE: [8, 9], BA: [8, 8], BR: [10, 11], BG: [8, 9], CA: [10, 10], CL: [9, 9], CN: [11, 11],
  CO: [10, 10], HR: [8, 9], CY: [8, 8], CZ: [9, 9], DK: [8, 8], EG: [10, 10], EE: [7, 8],
  FI: [9, 10], FR: [9, 9], GE: [9, 9], DE: [10, 11], GH: [9, 9], GR: [10, 10], HK: [8, 8],
  HU: [9, 9], IS: [7, 7], IN: [10, 10], ID: [9, 12], IE: [9, 9], IL: [9, 9], IT: [9, 10],
  JP: [10, 10], JO: [9, 9], KZ: [10, 10], KE: [9, 9], KW: [8, 8], LV: [8, 8], LB: [7, 8],
  LT: [8, 8], LU: [9, 9], MY: [9, 10], MT: [8, 8], MX: [10, 10], MD: [8, 8], ME: [8, 8],
  MA: [9, 9], NL: [9, 9], NZ: [8, 10], NG: [10, 10], MK: [8, 8], NO: [8, 8], OM: [8, 8],
  PK: [10, 10], PE: [9, 9], PH: [10, 10], PL: [9, 9], PT: [9, 9], QA: [8, 8], RO: [9, 9],
  RU: [10, 10], SA: [9, 9], RS: [8, 9], SG: [8, 8], SK: [9, 9], SI: [8, 8], ZA: [9, 9],
  KR: [9, 10], ES: [9, 9], SE: [7, 9], CH: [9, 9], TH: [9, 9], TN: [8, 8], TR: [10, 10],
  UA: [9, 9], AE: [9, 9], GB: [10, 10], US: [10, 10], VN: [9, 10],
};

// Mailbox providers whose whole product is an address that stops existing.
const THROWAWAY = /(mailinator|guerrillamail|10minutemail|yopmail|tempmail|temp-mail|trashmail|throwawaymail|sharklasers|maildrop|getnada|dispostable)\./i;

/** Digits only, minus the trunk zero people habitually type in front. */
const digitsOf = (raw) => String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');

/**
 * Everything about the submission that suggests it was not filled in honestly.
 * Deliberately conservative on the name and the address: a rule that fires on
 * an unusual but real name costs a real customer their place in the queue,
 * which is a far worse trade than letting "asdf" through unmarked.
 */
function findPenalties(lead) {
  const out = [];

  // The composed phone carries its dialling code, or does not. `+` is the tell.
  const rawPhone = String(lead?.phone ?? '').trim();
  if (rawPhone) {
    const digits = digitsOf(rawPhone.replace(/^\+\d{1,4}/, ''));
    if (!rawPhone.startsWith('+')) out.push('number has no country code');
    const [min, max] = PHONE_DIGITS[String(lead?.phoneIso ?? '').toUpperCase()] ?? GENERIC;
    if (digits.length < min || digits.length > max) {
      out.push(`number is ${digits.length} digits, expected ${min === max ? min : `${min}–${max}`}`);
    }
  }

  const tg = String(lead?.telegram ?? '').trim();
  if (tg && !TELEGRAM_RE.test(tg)) out.push('Telegram handle is not a valid handle');

  // Digits in a name, a single character, or one character held down.
  const name = String(lead?.name ?? '').trim();
  if (name) {
    if (/\d/.test(name)) out.push('name contains numbers');
    else if (name.replace(/\s/g, '').length < 2) out.push('name is one character');
    else if (/^(.)\1+$/.test(name.replace(/\s/g, ''))) out.push('name is one repeated character');
  }

  const email = String(lead?.email ?? '').trim();
  if (email) {
    if (THROWAWAY.test(email)) out.push('throwaway email address');
    else if (email.split('@')[0].length < 2) out.push('email has a one-character mailbox');
  }

  return out;
}

/**
 * Scores one lead. Returns the tier, the score, the reasons behind it and
 * anything suspect about the data, so the channel post can show its working
 * instead of an unexplained number.
 */
export function gradeLead(lead) {
  const answers = lead?.answers ?? {};
  const reasons = [];
  const gaps = [];
  let score = 0;

  // Timing. Nearly half the scale on its own: it is the only answer that says
  // when money actually moves.
  if (has(answers, BUYING_NOW)) {
    score += 4;
    reasons.push('buying now');
  } else if (has(answers, BUYING_WEEKS)) {
    score += 1;
    reasons.push('buying within weeks');
  }

  // Experience. Someone who failed an evaluation is the person this service
  // exists for. Someone who has never seen one has to be taught first, which is
  // a longer conversation and a worse conversion rate.
  if (has(answers, FAILED_BEFORE)) {
    score += 2;
    reasons.push('failed an evaluation before');
  } else if (has(answers, DONE_BEFORE)) {
    score += 1;
    reasons.push('has done an evaluation');
  } else if (has(answers, NEVER_DONE)) {
    gaps.push('never done an evaluation');
  }

  // Attention. Soft, but the video is where the offer is explained, so someone
  // who sat through all of it arrives with better questions.
  if (has(answers, WATCHED_ALL)) {
    score += 1;
    reasons.push('watched the whole video');
  } else if (has(answers, WATCHED_PART)) {
    gaps.push('only watched part of the video');
  }

  const penalties = findPenalties(lead);

  // Ways to reach them, given freely. Neither field is required any more, so
  // filling one in is a small act of intent — but only a usable one counts,
  // which is why these read the penalty list rather than mere presence.
  const phone = String(lead?.phone ?? '').trim();
  const badPhone = penalties.some((p) => p.startsWith('number'));
  if (phone && !badPhone) {
    score += 1;
    reasons.push('left a phone number');
  } else if (!phone) {
    gaps.push('no phone number');
  }

  const telegram = String(lead?.telegram ?? '').trim();
  const badTelegram = penalties.some((p) => p.startsWith('Telegram'));
  if (telegram && !badTelegram) {
    score += 1;
    reasons.push('left a Telegram handle');
  } else if (!telegram) {
    gaps.push('no Telegram handle');
  }

  score = Math.max(0, score - penalties.length);

  // Junk in the form caps the lead at warm however well it scored otherwise.
  let tier = score >= 7 ? 'high' : score >= 3 ? 'warm' : 'cold';
  if (penalties.length && tier === 'high') tier = 'warm';

  return { tier, score, max: MAX, ...TIERS[tier], reasons, gaps, penalties };
}
