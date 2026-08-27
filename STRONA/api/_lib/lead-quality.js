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
// The second half of this file is about the data itself. The questionnaire
// blocks on these same rules before submitting (src/lib/phone-rules.js is the
// one table both sides read), so junk from that path is rare — but the safe-page
// form and anything hitting the API directly still arrive unchecked, and get
// judged here. A penalty costs a point and is named in the channel post; it no
// longer hard-caps the tier, because the cap kept firing on false positives
// (a valid GB number against a stale length table) and each hit cost a real
// lead its /thank-you and its email. Only the two opening questions decide
// qualified/not — data quality never does.
//
// Matching is done on the answer text rather than the question text, because
// the answers are the distinctive part. Reword a question and this still works;
// reword an option label and the matching regex below has to move with it.

import { boundsFor, nationalDigits, splitDial, TELEGRAM_RE } from '../../src/lib/phone-rules.js';

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

// Mailbox providers whose whole product is an address that stops existing.
const THROWAWAY = /(mailinator|guerrillamail|10minutemail|yopmail|tempmail|temp-mail|trashmail|throwawaymail|sharklasers|maildrop|getnada|dispostable)\./i;

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
    // The dialling code comes off by longest known match, not by a greedy
    // `\+\d{1,4}` — that used to eat "+4860…" out of a Polish number typed
    // without the space, and the remainder failed the length check for it.
    const split = splitDial(rawPhone);
    const iso = String(lead?.phoneIso ?? '').toUpperCase() || split?.iso || '';
    const digits = nationalDigits(split ? split.rest : rawPhone, iso);
    if (!rawPhone.startsWith('+')) out.push('number has no country code');
    const [min, max] = boundsFor(iso);
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

  // Ways to reach them. The questionnaire requires both fields now, but the
  // safe-page form carries neither and direct API posts send anything at all —
  // so presence still earns the point, and only a usable entry counts, which
  // is why these read the penalty list rather than mere presence.
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

  // No hard cap on top of the point: the cap's real-world record was demoting
  // good leads over table drift, and the penalty is still named in the post,
  // so the desk sees exactly what is suspect before messaging anyone.
  const tier = score >= 7 ? 'high' : score >= 3 ? 'warm' : 'cold';

  return { tier, score, max: MAX, ...TIERS[tier], reasons, gaps, penalties };
}
