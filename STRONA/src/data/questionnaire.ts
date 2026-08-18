// Forex Passing — the application questionnaire.
//
// TWO funnels, and they ask different things because they sell different deals.
// The paid one (/meta and the rest of the site) runs seven steps; the free one
// (/freeaccount) runs four. What the free funnel drops and why is written at
// FREE_PRE_CONTACT below — the short version is that three of the seven steps
// talk about buying the evaluation, and on that offer we are the ones paying.
//
// Seven steps. It used to be seventeen, copied question for question off the
// reference funnel, which asks the same thing three different ways (three
// separate money questions, three information tiles in a row). Cut on the
// owner's instruction to the questions that actually change what we do:
// did they watch the video, do they accept that they buy the evaluation, do
// they know what one is, and when are they buying.
//
// `qualified: false` on an option ends the flow: that person sees the
// "not a fit" screen with a Telegram link and no lead is submitted. ONLY the
// two opening questions carry such an answer — the owner's rule is that
// qualification hangs on watching the video and accepting who buys the
// evaluation, nothing else. Money timing stayed a question because it scores
// the lead (api/_lib/lead-quality.js), but it no longer turns anyone away.
//
// Info steps carry no question; they exist to set expectations before the next
// answer. `template` picks the layout, `completeOnContinue` marks the final one.

import {
  CLIENT_SPLIT,
  EVAL_DISCOUNT,
  FREE_CHALLENGE_SIZE,
  FREE_TELEGRAM_HANDLE,
  OUR_SPLIT,
  TELEGRAM_HREF,
} from '../constants'

export type Option = { label: string; qualified: boolean }

export type Step =
  | {
      kind: 'question'
      title?: string
      description?: string
      question: string
      options: Option[]
    }
  | {
      kind: 'info'
      template?: 'official' | 'team' | 'social' | 'contract'
      title?: string
      body?: string
      bullets?: string[]
      detailRows?: [string, string][]
      note?: string
      continueLabel?: string
      completeOnContinue?: boolean
    }

/** @fxpassingadmin, without the https://t.me/ in front of it. */
const TELEGRAM_HANDLE = `@${TELEGRAM_HREF.split('/').pop()}`

/**
 * The discount is only ever stated where EVAL_DISCOUNT is set. Empty constant
 * ⇒ the sentence reads as if the discount never existed.
 */
const BUY_IT_YOURSELF =
  'You buy the prop firm evaluation yourself, in your own name, and it stays yours. ' +
  'We do not buy it for you.' +
  (EVAL_DISCOUNT ? ` What we do is take ${EVAL_DISCOUNT} off the price through our partner link.` : '')

/** Opens both funnels: the video is where either offer is explained. */
const WATCHED_VIDEO: Step = {
  kind: 'question',
  title: 'Before anything else',
  question: 'Did you watch the video the whole way through?',
  // The video is where the offer is explained; someone who has not finished
  // it is not turned into a lead — they see the Telegram card and can come
  // back once they have. Owner's call, 2026-08.
  options: [
    { label: 'Yes, all of it', qualified: true },
    { label: 'Not yet, only part of it', qualified: false },
  ],
}

/** Also in both funnels: what we are dealing with is the same either way. */
const EVAL_EXPERIENCE: Step = {
  kind: 'question',
  question: 'Do you know what a prop firm evaluation is?',
  // None of these disqualify. Someone who has never done one is the easiest
  // person to help, and someone who failed one is exactly who this is for.
  options: [
    { label: "Yes, I've done one", qualified: true },
    { label: "Yes, but I didn't pass it", qualified: true },
    { label: "No, I've never done one", qualified: true },
  ],
}

/** Asked before we take any contact details. */
export const PRE_CONTACT: Step[] = [
  WATCHED_VIDEO,
  {
    kind: 'question',
    title: 'How this works',
    description: BUY_IT_YOURSELF,
    question: 'Do you understand that you buy the evaluation yourself?',
    options: [
      { label: 'Yes, I understand', qualified: true },
      { label: "No, that doesn't work for me", qualified: false },
    ],
  },
]

/** Everything after the contact step. */
export const QUALIFICATION: Step[] = [
  EVAL_EXPERIENCE,
  {
    kind: 'info',
    title: 'One more time, so there is no confusion',
    body: BUY_IT_YOURSELF,
    note: 'Nothing is charged here, and nothing is owed to us until a payout has actually been released to you.',
    continueLabel: 'Understood',
  },
  {
    kind: 'question',
    question: 'When do you want to buy the evaluation?',
    // No answer here disqualifies any more: someone researching without the
    // money today is a lead to warm up, not to turn away. The answer still
    // decides most of the score, so the desk knows who to message first.
    options: [
      { label: 'Now', qualified: true },
      { label: 'Within a few weeks', qualified: true },
      { label: "I'm researching, I don't have the money right now", qualified: true },
    ],
  },
  {
    kind: 'info',
    template: 'contract',
    title: 'Once you are in, message us',
    body: 'Three things happen, in this order. Nothing else is asked of you.',
    bullets: [
      EVAL_DISCOUNT
        ? `You buy the prop firm evaluation. Our partner link takes ${EVAL_DISCOUNT} off the price.`
        : 'You buy the prop firm evaluation, in your own name.',
      'We guarantee the pass and manage the account for you.',
      `You get paid. Once the payout has landed, you send us ${OUR_SPLIT} and keep ${CLIENT_SPLIT}. Not before.`,
    ],
    // Carries what the deleted anti-impersonation tile used to say, without
    // costing a step: people get approached by fake accounts after applying.
    note: `Trading carries risk and an evaluation can fail; that is what the guarantee is for. ${TELEGRAM_HANDLE} is our only Telegram account, and anyone writing to you from another one is not us.`,
    continueLabel: 'Submit my application',
    completeOnContinue: true,
  },
]

/* --------------------------------------------------------------------------
 * The free funnel (/freeaccount).
 *
 * Four steps instead of seven. The three that go are the three that talk about
 * buying the evaluation — "you buy it yourself", its restatement, and when you
 * intend to pay — and on this offer we are the ones paying, so each of them
 * contradicts the lander the applicant just read.
 *
 * ⚠ The dropped timing question carried 4 of the 9 points in
 * api/_lib/lead-quality.js, which puts the `high` threshold of 7 out of reach
 * here. Routing to /thank-you therefore cannot hang on the score for this
 * funnel: api/event/subscribe.js decides it by source instead. Grading still
 * runs, because the desk reads it to choose who to message first.
 * ------------------------------------------------------------------------ */

export const FREE_PRE_CONTACT: Step[] = [WATCHED_VIDEO]

export const FREE_QUALIFICATION: Step[] = [
  EVAL_EXPERIENCE,
  {
    kind: 'info',
    template: 'contract',
    title: 'Once you are in, message us',
    body: 'Three things happen, in this order. Nothing else is asked of you.',
    bullets: [
      `We pay for your ${FREE_CHALLENGE_SIZE} prop firm challenge. You pay nothing — no fee, no deposit, no card.`,
      'We pass it and manage the funded account for you.',
      `You get paid. Once the payout has landed, you send us ${OUR_SPLIT} and keep ${CLIENT_SPLIT}. Not before.`,
    ],
    // Names the free-account handle, not the paid one: this is the address the
    // applicant is about to be sent to, so it is the one they have to recognise.
    note: `Trading carries risk and an evaluation can fail; that is what the guarantee is for. ${FREE_TELEGRAM_HANDLE} is our only Telegram account for the free challenge, and anyone writing to you from another one is not us.`,
    continueLabel: 'Submit my application',
    completeOnContinue: true,
  },
]
