// Forex Passing — the application questionnaire.
//
// Seven steps. It used to be seventeen, copied question for question off the
// reference funnel, which asks the same thing three different ways (three
// separate money questions, three information tiles in a row). Cut on the
// owner's instruction to the questions that actually change what we do:
// did they watch the video, do they accept that they buy the evaluation, do
// they know what one is, and when are they buying.
//
// `qualified: false` on an option ends the flow: that person sees the
// "not a fit" screen with a Telegram link and no lead is submitted. Two answers
// do that, and they are the two that make the service impossible: not accepting
// that the evaluation is bought by the client, and having no money for one.
//
// Info steps carry no question; they exist to set expectations before the next
// answer. `template` picks the layout, `completeOnContinue` marks the final one.

import { CLIENT_SPLIT, EVAL_DISCOUNT, OUR_SPLIT, TELEGRAM_HREF } from '../constants'

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

/** @forexpassingadmin, without the https://t.me/ in front of it. */
const TELEGRAM_HANDLE = `@${TELEGRAM_HREF.split('/').pop()}`

/**
 * The discount is only ever stated where EVAL_DISCOUNT is set. Empty constant
 * ⇒ the sentence reads as if the discount never existed.
 */
const BUY_IT_YOURSELF =
  'You buy the prop firm evaluation yourself, in your own name, and it stays yours. ' +
  'We do not buy it for you.' +
  (EVAL_DISCOUNT ? ` What we do is take ${EVAL_DISCOUNT} off the price through our partner link.` : '')

/** Asked before we take any contact details. */
export const PRE_CONTACT: Step[] = [
  {
    kind: 'question',
    title: 'Before anything else',
    question: 'Did you watch the video the whole way through?',
    // Both answers pass. Someone who skipped it is still a real applicant, and
    // the answer tells the desk which conversation they are walking into.
    options: [
      { label: 'Yes, all of it', qualified: true },
      { label: 'Not yet, only part of it', qualified: true },
    ],
  },
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
  {
    kind: 'question',
    question: 'Do you know what a prop firm evaluation is?',
    // None of these disqualify. Someone who has never done one is the easiest
    // person to help, and someone who failed one is exactly who this is for.
    options: [
      { label: "Yes, I've done one", qualified: true },
      { label: "Yes, but I didn't pass it", qualified: true },
      { label: "No, I've never done one", qualified: true },
    ],
  },
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
    options: [
      { label: 'Now', qualified: true },
      { label: 'Within a few weeks', qualified: true },
      { label: "I'm researching, I don't have the money right now", qualified: false },
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

/** Steps in order: two pre-contact questions, contact details, qualification. */
export const TOTAL_STEPS = PRE_CONTACT.length + 1 + QUALIFICATION.length
