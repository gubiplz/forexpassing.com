// <wistia-player> is a custom element defined at runtime by Wistia's player.js,
// so TypeScript has no way to know its attributes. Declaring the ones we set
// keeps the usage type-checked rather than cast away.

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type WistiaPlayerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  'media-id': string
  /** Width divided by height, e.g. "1.7777777777777777" for 16:9. */
  aspect?: string
  /** Hex colour for the play button and controls. */
  'player-color'?: string
  /** Attributes are strings on a custom element, so these are "true"/"false". */
  playbar?: string
  'playback-rate-control'?: string
  'settings-control'?: string
  resumable?: string
  'controls-visible-on-load'?: string
  autoplay?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'wistia-player': WistiaPlayerAttributes
    }
  }
}
