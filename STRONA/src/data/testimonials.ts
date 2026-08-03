// Client video testimonials for the money page.
//
// ⚠ PLACEHOLDER CONTENT. None of these people exist and none of these payouts
// happened. The names, amounts and stories below were written to fill the layout
// until real client clips are recorded, on an explicit owner decision.
//
// They sit on the same page as the Pro Traders Funding certificates, which are
// real and pulled from the firm's public API by bin/sync-payouts.mjs. A reader
// cannot tell the two apart. Replace these with real recordings before the page
// goes in front of an ad-platform review.
//
// To go live with a real one: drop the YouTube id into `videoId` and the card
// swaps from a poster to a player. Nothing is requested from YouTube until the
// reader actually presses play.

export type Testimonial = {
  /** YouTube id. Empty renders the poster and the play button, and nothing else. */
  videoId: string
  name: string
  /** Rendered as "$5,100 PAID". */
  payoutUsd: number
  /** Short uppercase context line, parts separated by · in the layout. */
  tags: string[]
  story: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    videoId: '',
    name: 'Marcus',
    payoutUsd: 5100,
    tags: ['Full-time job', 'No time to trade', 'Hands-off'],
    story:
      'Marcus works six days a week and never had the hours to learn charting properly. He bought a $100K evaluation and left it with the desk from the first day. His first payout came to $5,100.',
  },
  {
    videoId: '',
    name: 'Daniel',
    payoutUsd: 6800,
    tags: ['Four failed resets', 'Zero background', '$200K evaluation'],
    story:
      'Daniel had burned through four evaluations on his own before he stopped trying to trade them himself. The fifth one he handed over. It passed, and the account has since released $6,800 to him.',
  },
  {
    videoId: '',
    name: 'Tomas',
    payoutUsd: 12400,
    tags: ['Business owner', '$400K evaluation', 'Talked out of it'],
    story:
      'Tomas went straight for the largest size we run and was told by everyone around him that it was a bad idea. He took a $12,400 payout, paid the 30% without any drama, and asked about the next account the same week.',
  },
  {
    videoId: '',
    name: 'Priya',
    payoutUsd: 3450,
    tags: ['Passed alone', 'Blew it alone', 'Back with the desk'],
    story:
      'Priya passed an evaluation by herself and lost the funded account three weeks later on one bad afternoon. She bought another and handed it over rather than repeat it. $3,450 released so far.',
  },
]
