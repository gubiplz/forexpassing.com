// Funnel slug attribution — path-based paid-traffic signal.
// Operator runs per-platform campaigns each pointing to a vanity slug.

import type { ReasonEntry } from './types.ts';

export type FunnelSource = 'meta' | 'insta' | 'google' | 'tiktok' | null;

const FUNNEL_PATHS: Record<string, FunnelSource> = {
  '/meta-funnel': 'meta',
  '/insta-funnel': 'insta',
  '/google-funnel': 'google',
  '/tiktok-funnel': 'tiktok',
};

export function detectFunnel(pathname: string): FunnelSource {
  return FUNNEL_PATHS[pathname] ?? null;
}

export function scoreFunnel(source: FunnelSource, hasClickId: boolean): ReasonEntry[] {
  if (!source) return [];
  if (hasClickId) {
    return [
      {
        code: 'funnel_with_click',
        detail: `funnel=${source} + click ID (paid traffic confirmed)`,
        weight: 25,
      },
    ];
  }
  return [
    {
      code: 'funnel_no_click',
      detail: `funnel=${source} without click ID (direct paste from ${source} dashboard)`,
      weight: -30,
    },
  ];
}

export const ALL_FUNNEL_PATHS = Object.keys(FUNNEL_PATHS);
