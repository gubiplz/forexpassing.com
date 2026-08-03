// Client video testimonials for the money page.
//
// ⚠ UNVERIFIED CONTENT. The entries without a `videoId` are pure placeholders —
// those people do not exist and those payouts did not happen. They were written
// to fill the layout until clips are recorded, on an explicit owner decision,
// and each one renders as a slot that says it is waiting for a recording.
//
// The published clip is a scripted read, not a vetted client interview: the
// speaker works from a template and never states a name of his own. So the name
// and the figure below are the claim made in the video, not something anyone
// checked. That matters because these cards sit on the same page as the Pro
// Traders Funding certificates, which are real and pulled from the firm's public
// API by bin/sync-payouts.mjs — a reader cannot tell the two apart.
//
// To publish one: drop the YouTube id into `videoId` and save the vertical frame
// as a local `poster`. Nothing is requested from YouTube until the reader
// actually presses play.

export type Testimonial = {
  /** YouTube id. Empty leaves the slot in its "being filmed" state. Shorts work as-is. */
  videoId: string
  /**
   * Own-origin still, shown until play is pressed. Grabbed from
   * `i.ytimg.com/vi/<id>/oardefault.jpg` — the only variant that keeps a Short's
   * real 9:16 frame; `hqdefault` is a letterboxed 4:3 crop. Rehosted as webp so
   * the card costs no third-party connection and a third of the bytes.
   */
  poster: string
  name: string
  /** Rendered as "$5,100 PAID". */
  payoutUsd: number
  /** Short uppercase context line, parts separated by · in the layout. */
  tags: string[]
  story: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    videoId: '0xt3jpPtnvc',
    poster: '/testi-mike.webp',
    name: 'Mike',
    payoutUsd: 68000,
    tags: ['Zero background', '$200K evaluation', 'Scaled up'],
    story:
      'Six months ago Mike had never touched a prop account and could not have told you what a pip was. He took a $200K evaluation, cleared it, and the first payout came back at $68,000. He paid the split, scaled straight into a larger account, and says he spent the whole time waiting for a catch that never came.',
  },
  {
    videoId: '',
    poster: '',
    name: 'Marcus',
    payoutUsd: 5100,
    tags: ['Full-time job', 'No time to trade', 'Hands-off'],
    story:
      'Marcus works six days a week and never had the hours to learn charting properly. He bought a $100K evaluation and left it with the desk from the first day. His first payout came to $5,100.',
  },
  {
    videoId: '',
    poster: '',
    name: 'Tomas',
    payoutUsd: 12400,
    tags: ['Business owner', '$400K evaluation', 'Talked out of it'],
    story:
      'Tomas went straight for the largest size we run and was told by everyone around him that it was a bad idea. He took a $12,400 payout, paid the 30% without any drama, and asked about the next account the same week.',
  },
  {
    videoId: '',
    poster: '',
    name: 'Priya',
    payoutUsd: 3450,
    tags: ['Passed alone', 'Blew it alone', 'Back with the desk'],
    story:
      'Priya passed an evaluation by herself and lost the funded account three weeks later on one bad afternoon. She bought another and handed it over rather than repeat it. $3,450 released so far.',
  },
]
