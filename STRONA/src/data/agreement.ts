// The management agreement, as structured data rather than prose.
//
// Kept as data for the same reason the payouts and the track record are: the
// document is rendered in more than one place (the /contract page today, a
// modal tomorrow), and a contract that exists twice as hand-written JSX ends up
// saying two different things. Numbers come from ../constants — the split, the
// guarantee and the window are never typed in here.
//
// ⚠ THIS IS A SPECIMEN, NOT A SIGNED INSTRUMENT AND NOT LEGAL ADVICE.
// It is published so an applicant can read the terms before applying. The copy
// a client signs is prepared per account, carries the real names, dates and
// account size in place of the [PLACEHOLDERS], and is the version that governs.
// Before this is used as an actual contract it needs a lawyer's pass — see the
// note rendered under the document.

import {
  BRAND,
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  GUARANTEE_CREDIT,
  OUR_SPLIT,
  PASS_WINDOW,
  REFUND_WINDOW,
} from '../constants'

export type Block =
  | { type: 'paragraph'; text: string }
  /** a) b) c) — used where the client picks between remedies. */
  | { type: 'lettered'; items: string[] }
  /** An optionally-headed bullet list, e.g. "The Company shall:". */
  | { type: 'list'; label?: string; items: string[] }

export type Section = { number: string; heading: string; blocks: Block[] }

export type Agreement = {
  title: string
  preamble: string[]
  sections: Section[]
  signature: { role: string; name: string }[]
}

export const AGREEMENT: Agreement = {
  title: 'Account Management Agreement',

  preamble: [
    'This Account Management Agreement ("Agreement") is entered into on [DATE], by and between:',
    '',
    `${BRAND}, hereinafter referred to as the "Company,"`,
    '',
    'and',
    '',
    '[CLIENT_FULL_NAME], hereinafter referred to as the "Client."',
  ],

  sections: [
    {
      number: '1',
      heading: 'Purpose of Agreement',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Client engages the Company to trade a proprietary firm evaluation account, and any funded account arising from it, on the Client\'s behalf. The Company agrees to trade the account with the objective of passing the evaluation and, once funded, of producing payouts under the rules of the proprietary trading firm that issued it.',
        },
        {
          type: 'paragraph',
          text: 'The account referred to in this Agreement is an evaluation account of [ACCOUNT_SIZE] issued by [PROP_FIRM] and purchased by the Client in the Client\'s own name.',
        },
      ],
    },

    {
      number: '2',
      heading: 'Eligibility and Firm Rules',
      blocks: [
        {
          type: 'paragraph',
          text: 'Proprietary trading firms differ on whether a third party may trade an account. Some permit it where the arrangement is disclosed and approved in writing; others prohibit it outright and void any result achieved that way.',
        },
        {
          type: 'paragraph',
          text: 'Before any trading begins, the Company shall establish in writing whether the firm that issued the account permits management by a third party. Where the firm prohibits it, this Agreement does not come into effect, no trading is carried out, and nothing is owed by either party.',
        },
        {
          type: 'paragraph',
          text: 'The Client shall not misrepresent to the firm who is trading the account, and the Company shall not ask the Client to do so.',
        },
      ],
    },

    {
      number: '3',
      heading: 'Ownership and Account Access',
      blocks: [
        {
          type: 'paragraph',
          text: 'The account is purchased by the Client, is held in the Client\'s name, and remains the Client\'s property throughout. Nothing in this Agreement transfers ownership of the account, of the funds in it, or of any payout arising from it.',
        },
        {
          type: 'paragraph',
          text: 'The Client grants the Company trading access to the account for the term of this Agreement. The Client retains the platform login and may observe every position, order and drawdown in real time.',
        },
        {
          type: 'paragraph',
          text: 'The Client may revoke access at any moment by changing the account password. Revocation takes effect immediately and is treated as notice of termination under Section 7.',
        },
      ],
    },

    {
      number: '4',
      heading: 'Profit Sharing',
      blocks: [
        {
          type: 'paragraph',
          text: 'Once the account is funded and a payout has been released by the proprietary trading firm to the Client, the released amount shall be shared as follows:',
        },
        {
          type: 'list',
          items: [`${CLIENT_SPLIT} to the Client`, `${OUR_SPLIT} to the Company`],
        },
        {
          type: 'paragraph',
          text: 'The Company\'s share is invoiced after the firm has released the payout and is paid out of funds already received by the Client. Payment is due within five (5) business days of the invoice.',
        },
        {
          type: 'paragraph',
          text: 'There is no monthly fee, no setup fee and no charge while an evaluation is in progress. Where no payout is ever released, the Company is owed nothing under this Section.',
        },
      ],
    },

    {
      number: '5',
      heading: 'Guarantee and Failure Clause',
      blocks: [
        {
          type: 'paragraph',
          text: 'An evaluation may fail. Where the account is breached, disqualified or otherwise lost while the Company is trading it, the Client shall be entitled to choose one of the following remedies:',
        },
        {
          type: 'lettered',
          items: [
            'a refund of all amounts the Client has paid to the Company in respect of that account; or',
            `a refund of those amounts together with a ${GUARANTEE_CREDIT} credit toward the cost of a further evaluation.`,
          ],
        },
        {
          type: 'paragraph',
          text: `The choice between these remedies rests solely with the Client. This clause may be relied upon for ${REFUND_WINDOW} from the date on which trading begins.`,
        },
        {
          type: 'paragraph',
          text: 'This clause covers what the Client has paid the Company. It does not cover the fee the Client paid the proprietary trading firm for the evaluation itself, which is a matter between the Client and that firm.',
        },
      ],
    },

    {
      number: '6',
      heading: 'Responsibilities',
      blocks: [
        {
          type: 'list',
          label: 'The Company shall:',
          items: [
            'trade the account within the rules of the issuing firm, including its daily loss limit, maximum drawdown, minimum trading days and any news or weekend restrictions',
            'apply its own strategy and risk management, and size positions at its own discretion within those rules',
            'give the Client a straight account of how the account is being run on request',
            'notify the Client without delay where a rule is breached or the account is lost',
          ],
        },
        {
          type: 'list',
          label: 'The Client shall:',
          items: [
            'not trade the account, close positions or alter orders while this Agreement is in force',
            'provide accurate account details and keep the Company informed of any change to them',
            'forward without delay any communication from the issuing firm that concerns the account',
          ],
        },
      ],
    },

    {
      number: '7',
      heading: 'Term and Termination',
      blocks: [
        {
          type: 'paragraph',
          text: 'This Agreement begins on the date stated above and continues until terminated under this Section.',
        },
        {
          type: 'paragraph',
          text: 'Either party may terminate on five (5) days\' written notice, provided no evaluation or funded account is in progress at the time. Where trading is in progress, either party may still terminate immediately, in which case open positions shall be closed at market and Section 5 shall not apply.',
        },
        {
          type: 'paragraph',
          text: 'Termination does not affect any share of a payout already released before the date of termination.',
        },
      ],
    },

    {
      number: '8',
      heading: 'Data and Confidentiality',
      blocks: [
        {
          type: 'paragraph',
          text: 'Information the Client provides is used to prepare and perform this Agreement and for no other purpose. It is not sold and is not passed to third parties, save where disclosure to the issuing firm is required to obtain approval under Section 2, or where disclosure is required by law.',
        },
        {
          type: 'paragraph',
          text: `What is stored and for how long is set out in the privacy policy published at ${BRAND.toLowerCase().replace(/\s+/g, '')}.com/privacy. Requests concerning stored data may be sent to ${CONTACT_EMAIL}.`,
        },
      ],
    },

    {
      number: '9',
      heading: 'No Guarantee of Results',
      blocks: [
        {
          type: 'paragraph',
          text: `The Company does not warrant that any evaluation will be passed, that any account will be funded, or that any payout will arise. Where an evaluation is passed it has typically taken ${PASS_WINDOW}; that is a description of past accounts and not an undertaking as to this one.`,
        },
        {
          type: 'paragraph',
          text: 'Trading carries risk of loss. Past performance, whether of the Company or of any account it has traded, does not indicate future results. Nothing in this Agreement is investment advice or a solicitation to invest.',
        },
      ],
    },

    {
      number: '10',
      heading: 'Entire Agreement and Governing Law',
      blocks: [
        {
          type: 'paragraph',
          text: 'This Agreement is the entire agreement between the parties in respect of the account and supersedes anything said or written before it. It may be varied only in writing signed by both parties.',
        },
        {
          type: 'paragraph',
          text: 'This Agreement shall be governed by and construed in accordance with the laws of [COUNTRY], and the courts of [COUNTRY] shall have exclusive jurisdiction over any dispute arising out of it.',
        },
      ],
    },

    {
      number: '11',
      heading: 'Acknowledgment',
      blocks: [
        {
          type: 'paragraph',
          text: 'By signing below, both parties acknowledge that they have read this Agreement, understood it, and agreed to be bound by every term of it, including Section 9, which states plainly that no result is promised.',
        },
      ],
    },
  ],

  signature: [
    { role: 'For the Company', name: BRAND },
    { role: 'The Client', name: '[CLIENT_FULL_NAME]' },
  ],
}
