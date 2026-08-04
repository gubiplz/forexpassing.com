// Client video testimonials for the money page.
//
// ⚠ UNVERIFIED CONTENT. The published clip is a scripted read, not a vetted
// client interview: the speaker works from a template and never states a name of
// his own. So the name and the figure below are the claim made in the video, not
// something anyone checked. That matters because this card sits on the same page
// as the Pro Traders Funding certificates, which are real and pulled from the
// firm's public API by bin/sync-payouts.mjs — a reader cannot tell the two apart.
//
// Only filmed clips belong here — no invented people, no payouts nobody
// received. An entry without a `videoId` renders as a slot saying a recording is
// on the way, which is the only honest way to hold space for one.
//
// To publish one: drop the YouTube id into `videoId` and save the vertical frame
// as a local `poster`. Nothing is requested from YouTube until the reader
// actually presses play.

export type Testimonial = {
  /**
   * YouTube id. Empty leaves the slot in its "being filmed" state, and then
   * every field below is ignored — a slot renders no name, no rating and no
   * payout, because there is nobody to attribute them to yet. Leave them empty
   * rather than filling them in advance. Shorts work as-is.
   */
  videoId: string
  /**
   * Own-origin still, shown until play is pressed. Use the cover art from the
   * shoot — the `-cover-hook.jpg` next to the footage in TESTIMONIALS —
   * converted to webp. Never pull it from i.ytimg.com: those endpoints only
   * return a frame YouTube picked out of the video, while the custom thumbnail
   * the channel uploaded is not exposed publicly. Taking the easy route there
   * silently ships a different image than the one people see on YouTube.
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
    videoId: 'OMzdaKxAM7g',
    poster: '/testi-mike.webp',
    name: 'Mike',
    payoutUsd: 68340,
    tags: ['Zero background', '$200K evaluation', 'Scaled up'],
    story:
      'Six months ago Mike had never touched a prop account and could not have told you what a pip was. He took a $200K evaluation, cleared it, and the first payout came back at $68,340. He paid the split, scaled straight into a larger account, and says he spent the whole time waiting for a catch that never came.',
  },

  // Three reserved slots. Filling one is two values — the YouTube id and a local
  // poster — plus the name, payout and story from the clip itself. Until then
  // they render as dashed frames that say a recording is on the way.
  { videoId: '', poster: '', name: '', payoutUsd: 0, tags: [], story: '' },
  { videoId: '', poster: '', name: '', payoutUsd: 0, tags: [], story: '' },
  { videoId: '', poster: '', name: '', payoutUsd: 0, tags: [], story: '' },
]
