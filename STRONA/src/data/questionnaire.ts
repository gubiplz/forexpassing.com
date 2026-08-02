// Forex Passing — the application questionnaire.
//
// Question for question the same set the reference funnel runs, by explicit
// owner decision. The order is: one pre-contact question, the contact details,
// then the qualification steps.
//
// `qualified: false` on an option ends the flow: that person sees the
// "not a fit" screen with a Telegram link and no lead is submitted. That is how
// the reference funnel behaves and it is the point of the questionnaire — it
// filters before anyone's time is spent.
//
// Info steps carry no question; they exist to set expectations before the next
// answer. `template` picks the layout, `completeOnContinue` marks the final one.

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
      template?: 'plain' | 'official' | 'team' | 'social' | 'contract'
      title?: string
      body?: string
      bullets?: string[]
      detailRows?: [string, string][]
      note?: string
      continueLabel?: string
      completeOnContinue?: boolean
    }

/** Asked before we take any contact details. */
export const PRE_CONTACT: Step[] = [
  {
    kind: 'question',
    title: 'How this service works',
    description:
      "You purchase a prop firm evaluation yourself. We provide account-management services under the prop firm's rules. We do not purchase the evaluation for you, and outcomes are not guaranteed.",
    question: 'Do you understand that you buy the evaluation yourself?',
    options: [
      { label: 'Yes, I understand', qualified: true },
      { label: 'No, I thought you paid for it', qualified: false },
    ],
  },
]

/** Everything after the contact step. */
export const QUALIFICATION: Step[] = [
  {
    kind: 'question',
    question: 'Are you interested in a hands-off prop firm account management service?',
    options: [
      { label: 'Yes', qualified: true },
      { label: 'Not sure yet', qualified: true },
      { label: 'No', qualified: false },
    ],
  },
  {
    kind: 'question',
    question: 'Have you heard of prop firm evaluations before?',
    options: [
      { label: 'Yes', qualified: true },
      { label: 'A little', qualified: true },
      { label: 'No, this is new to me', qualified: true },
    ],
  },
  {
    kind: 'info',
    body: 'We currently work with a limited set of prop firms. Service availability depends on eligibility and capacity.',
  },
  {
    kind: 'question',
    question: 'If accepted, when would you want to begin the application process?',
    options: [
      { label: 'As soon as possible', qualified: true },
      { label: 'Within the next few weeks', qualified: true },
      { label: 'Next month', qualified: true },
      { label: 'Just researching for now', qualified: false },
    ],
  },
  {
    kind: 'question',
    question: 'Are you open to using a prop firm we recommend, provided the terms are explained first?',
    options: [
      { label: 'Yes', qualified: true },
      { label: "I'd like more information first", qualified: true },
      { label: 'No, I only want a specific firm', qualified: false },
    ],
  },
  {
    kind: 'info',
    title: 'Service overview',
    bullets: [
      'You purchase the prop firm evaluation',
      "We manage the account under that firm's rules",
      'Fees and terms are explained before you commit — results vary and are not guaranteed',
    ],
  },
  {
    kind: 'question',
    question: 'What is your approximate monthly income from your primary source?',
    options: [
      { label: 'Under $1,000', qualified: true },
      { label: '$1,000 – $3,000', qualified: true },
      { label: '$3,000 – $5,000', qualified: true },
      { label: '$5,000+', qualified: true },
    ],
  },
  {
    kind: 'question',
    description:
      'Starting requires purchasing a prop firm evaluation yourself. Typical evaluation fees vary by firm and account size. Our management fee structure is explained before you commit.',
    question: 'Are you able and willing to purchase an evaluation if accepted?',
    options: [
      { label: 'Yes', qualified: true },
      { label: 'Not at this time', qualified: false },
    ],
  },
  {
    kind: 'question',
    question:
      'Do you currently have funds available for an evaluation without borrowing or using money needed for essential expenses?',
    options: [
      { label: 'Yes', qualified: true },
      { label: 'Not yet, but I may within a few weeks', qualified: true },
      { label: 'No', qualified: false },
    ],
  },
  {
    kind: 'question',
    question: 'Is there anything that would stop you from applying right now?',
    options: [
      { label: "Nothing — I'm ready to apply", qualified: true },
      { label: 'I need more time to decide', qualified: false },
      { label: 'Timing is not right', qualified: false },
    ],
  },
  {
    kind: 'question',
    title: 'Communication',
    description:
      'If accepted, onboarding and support continue through Telegram. This keeps service communication in one place.',
    question: 'Are you comfortable continuing through Telegram if accepted?',
    options: [
      { label: 'Yes', qualified: true },
      { label: 'No', qualified: false },
    ],
  },
  {
    kind: 'info',
    template: 'official',
    title: 'Official Forex Passing communication',
    body: 'Before continuing, please note that impersonators exist. Use only our official channels.',
    detailRows: [
      ['Official website', 'forexpassing.com'],
      ['Official email', 'contact@forexpassing.com'],
      ['Official Telegram', '@forexpassingadmin'],
    ],
    note: 'That is our only official Telegram account. Anyone contacting you from another account claiming to be Forex Passing is not us.',
    continueLabel: 'Continue',
  },
  {
    kind: 'info',
    template: 'team',
    title: 'Meet some of the team',
    body: 'Our desk provides support and account-management services. Experience and availability vary.',
    note: 'The team can answer questions about the process and the next steps.',
    continueLabel: 'Continue',
  },
  {
    kind: 'info',
    template: 'social',
    title: 'Community & support channels',
    bullets: ['Support team', 'Educational livestreams', 'Community updates', 'Service communications'],
    note: 'Please verify you join the official channel shared after approval.',
    continueLabel: 'Continue',
  },
  {
    kind: 'info',
    template: 'contract',
    title: 'Service acknowledgement',
    body: 'Please confirm you understand how the service works. Trading and prop firm evaluations involve risk of loss. Past performance is not indicative of future results.',
    bullets: [
      'I purchase the prop firm evaluation myself',
      'Service terms and fees are explained before I commit',
      'Outcomes are not guaranteed and may vary',
    ],
    continueLabel: 'Submit my application',
    completeOnContinue: true,
  },
]

/** Steps in order: pre-contact question, contact details, qualification. */
export const TOTAL_STEPS = PRE_CONTACT.length + 1 + QUALIFICATION.length

/** The step where the income bracket is asked — flagged in the privacy policy. */
export const INCOME_QUESTION = 'What is your approximate monthly income from your primary source?'
