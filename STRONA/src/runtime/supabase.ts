// Supabase client for the partner portal.
//
// The whole portal is optional: if VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// are not set in the Vercel project, `supabase` is null and the portal page
// says so instead of throwing. The build must never depend on these being
// present — every other page has to keep working without them.
//
// The anon key is public by design; what protects the data is row level
// security (see supabase/schema.sql). The service-role key lives only in the
// serverless function that counts clicks and is never bundled.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const PORTAL_ENABLED = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = PORTAL_ENABLED
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export type PartnerStats = {
  slug: string;
  display_name: string;
  clicks: number;
  confirmed: number;
  pending: number;
  tier: string;
  next_tier: string | null;
  to_next_tier: number;
};

export type Referral = {
  id: string;
  email: string;
  account_size: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
};

/** Aggregates for the signed-in partner. `null` when signed out or not set up. */
export async function fetchStats(): Promise<PartnerStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('partner_stats');
  if (error || !data || !data.length) return null;
  return data[0] as PartnerStats;
}

export async function fetchReferrals(): Promise<Referral[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('referrals')
    .select('id, email, account_size, status, created_at')
    .order('created_at', { ascending: false });
  return error || !data ? [] : (data as Referral[]);
}

/** Slug proposal from a display name — the same shape the schema enforces. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,31}$/;

/** The public link a partner shares. */
export function referralUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? 'https://forexpassing.com' : window.location.origin;
  return `${origin.replace(/^https?:\/\//, '')}/r/${slug}`;
}
