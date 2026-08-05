// Pytania i odpowiedzi o usłudze — jedno źródło dla /meta i /thank-you.
//
// Mieszkały wcześniej lokalnie w MoneyPage.tsx. Wyjęte, bo strona podziękowania
// zadaje te same pytania jeszcze raz, tuż przed pierwszą wiadomością na
// Telegramie, a dwie kopie dwunastu odpowiedzi o splicie i gwarancji rozjechałyby
// się przy pierwszej zmianie warunków.
//
// Każda liczba pochodzi z constants.ts. Odpowiedź o gwarancji musi mieć pokrycie
// w umowie (src/data/agreement.ts §5) — GUARANTEE_LINE pilnuje, żeby brzmiała
// wszędzie tak samo.

import {
  CLIENT_SPLIT,
  EVAL_DISCOUNT,
  GUARANTEE_LINE,
  OUR_SPLIT,
  PARTNER_FIRM,
  PASS_WINDOW,
  REFUND_WINDOW,
} from '../constants'

export type FaqItem = { q: string; a: string }

export const FAQ: FaqItem[] = [
  { q: 'Who actually trades the account?', a: 'Our trading desk. You give us platform access under a written agreement and we execute inside your firm’s risk rules: daily loss, max drawdown, minimum days, all of it.' },
  { q: 'Do I have to trade at all?', a: 'No. That is the whole point. You are not expected to watch charts or place orders. If you want to keep trading your own separate accounts, that is your call.' },
  { q: `How does the ${CLIENT_SPLIT}/${OUR_SPLIT} split work?`, a: `You keep ${CLIENT_SPLIT} of every payout, we take ${OUR_SPLIT}. The firm pays you first. Our share is invoiced after the money has actually landed with you.` },
  { q: 'When exactly do you get paid?', a: 'Only after a payout is released by the prop firm. There is no fee for trying, no monthly charge, and nothing to pay while an evaluation is running.' },
  { q: 'What if you fail the challenge?', a: `${GUARANTEE_LINE} The exact wording is clause 5 of the agreement. Read it before you sign, not after.` },
  { q: 'How long is the guarantee?', a: `${REFUND_WINDOW}. Inside that window you pick the remedy without an interrogation; you return the managed account to us and we settle up.` },
  { q: 'How long does it take to pass?', a: `Usually ${PASS_WINDOW}, depending on the firm’s rules (minimum trading days and daily drawdown mostly) and on the market. It can take longer. It can also fail; nobody can promise otherwise.` },
  { q: 'Which prop firms do you work with?', a: `Only firms whose terms permit a third party to trade the account. We work with ${PARTNER_FIRM} and check the current rules for whichever firm you bring before anything starts.` },
  { q: 'Is this even allowed?', a: 'It depends entirely on the firm. Some permit managed accounts under an agreement, others ban it outright and will void results. We check yours first and tell you straight if the answer is no.' },
  { q: 'Do I have to buy the evaluation myself?', a: `Yes. You buy the evaluation and it stays in your name. That is what keeps the account, and the payouts, yours.${EVAL_DISCOUNT ? ` You do not pay full price for it: our partner link takes ${EVAL_DISCOUNT} off at the firm's checkout, and we send it once you are accepted.` : ''}` },
  { q: 'What happens to my data?', a: 'The questionnaire goes to our team and nowhere else. We use it to prepare the call and the agreement. We do not sell it and we do not pass it on.' },
  { q: 'Why you and not one of the other management services?', a: 'Because everything above is written down before you commit: who trades, what happens when it fails, when we get paid, and how you walk away. Ask any of the others for that in writing.' },
]
