// Client video testimonials for the money page.
//
// ⚠ UNVERIFIED CONTENT. The published clips are scripted reads, not vetted
// client interviews: the speakers work from a template, and the names come from
// the brief rather than from any account anyone opened. So the names and the
// figures below are the claim made in the video, not something anyone checked.
// That matters because these cards sit on the same page as the Pro Traders
// Funding certificates, which are real and pulled from the firm's public API by
// bin/sync-payouts.mjs — a reader cannot tell the two apart.
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
   * Own-origin still, shown until play is pressed. Use the cover art delivered
   * with the shoot — the `-cover-hook.jpg` / `-Cover.jpg` sitting next to the
   * footage in TESTIMONIALS — converted to webp at 600px wide
   * (`cwebp -q 80 -resize 600 0`). Never pull it from i.ytimg.com: those only
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

  {
    videoId: 'kH0yc_UoPhQ',
    poster: '/testi-couple.webp',
    name: 'Angelina & Ryan',
    payoutUsd: 7420,
    tags: ['Told by his wife', '$400K evaluation', 'Own strategy'],
    story:
      'Angelina spent years watching Ryan risk their savings on the markets. The stress was never the losses — it was knowing what was on the line every time he opened a position. Then he stopped using their money and took a $400K evaluation instead, cleared it on his own strategy, and the first payout came back at $7,420. Same trader, same strategy, different money behind it.',
  },

  // Two reserved slots, keeping the row at four. Filling one is two values — the
  // YouTube id and a local poster — plus the name, payout and story from the clip
  // itself. Until then they render as dashed frames that say a recording is on
  // the way. Add a published clip and drop a slot, or the grid wraps a fifth card
  // onto its own line.
  { videoId: '', poster: '', name: '', payoutUsd: 0, tags: [], story: '' },
  { videoId: '', poster: '', name: '', payoutUsd: 0, tags: [], story: '' },
]
