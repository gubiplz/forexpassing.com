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
// question: buying now is worth 4 of the 8 points and everything else put
// together is the other 4, against a threshold of 6. Stated plainly, a
// high-quality lead is someone buying now who also brings at least two of the
// three remaining signals — experience, attention, a phone number. Buying now
// and nothing else lands in warm, which is the honest reading of it.
//
// Matching is done on the answer text rather than the question text, because
// the answers are the distinctive part. Reword a question and this still works;
// reword an option label and the matching regex below has to move with it.

const MAX = 8;

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

/**
 * Scores one lead. Returns the tier, the score, and the reasons behind it, so
 * the channel post can show its working instead of an unexplained number.
 */
export function gradeLead(lead) {
  const answers = lead?.answers ?? {};
  const reasons = [];
  const gaps = [];
  let score = 0;

  // Timing. Half the scale on its own: it is the only answer that says when
  // money actually moves.
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

  // A second way to reach them, given freely — the field is optional, so
  // filling it in is a small act of intent.
  if (String(lead?.phone ?? '').trim()) {
    score += 1;
    reasons.push('left a phone number');
  } else {
    gaps.push('no phone number');
  }

  const tier = score >= 6 ? 'high' : score >= 3 ? 'warm' : 'cold';
  return { tier, score, max: MAX, ...TIERS[tier], reasons, gaps };
}
