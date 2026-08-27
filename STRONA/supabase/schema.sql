-- Forex Passing — partner programme schema.
--
-- Run once, in the SQL editor of a FRESH Supabase project. Do not run it in the
-- prop-funding or 8amest projects.
--
-- Everything a partner can reach goes through row level security: a signed-in
-- partner reads and writes only their own row and their own referrals. Click
-- counts are written by the /r/<slug> serverless function with the service-role
-- key and are never readable row-by-row from the browser — the dashboard gets
-- aggregates from partner_stats(), which only ever answers about the caller.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.partners (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 60),
  slug          text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  testimonial   text check (testimonial is null or char_length(testimonial) <= 600),
  funded_link   text check (funded_link is null or funded_link ~* '^https?://'),
  created_at    timestamptz not null default now()
);

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partners (id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  account_size text,
  -- A referral is only ever confirmed by us, by hand, once the prop firm has
  -- actually released a payout. Partners can create rows but never promote them.
  status       text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'rejected')),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists referrals_partner_idx on public.referrals (partner_id);

create table if not exists public.referral_clicks (
  id         bigserial primary key,
  slug       text not null,
  clicked_at timestamptz not null default now(),
  ua         text,
  referrer   text
);

create index if not exists referral_clicks_slug_idx on public.referral_clicks (slug);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.partners        enable row level security;
alter table public.referrals       enable row level security;
alter table public.referral_clicks enable row level security;

drop policy if exists partners_select_own on public.partners;
create policy partners_select_own on public.partners
  for select using (auth.uid() = id);

drop policy if exists partners_insert_own on public.partners;
create policy partners_insert_own on public.partners
  for insert with check (auth.uid() = id);

drop policy if exists partners_update_own on public.partners;
create policy partners_update_own on public.partners
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select using (auth.uid() = partner_id);

-- Insert only as yourself and only as pending: status is ours to move.
drop policy if exists referrals_insert_own on public.referrals;
create policy referrals_insert_own on public.referrals
  for insert with check (auth.uid() = partner_id and status = 'pending');

drop policy if exists referrals_delete_own_pending on public.referrals;
create policy referrals_delete_own_pending on public.referrals
  for delete using (auth.uid() = partner_id and status = 'pending');

-- No policies on referral_clicks: with RLS on and nothing granted, only the
-- service-role key (which bypasses RLS) can touch it.

-- ---------------------------------------------------------------------------
-- Dashboard aggregates
-- ---------------------------------------------------------------------------

create or replace function public.partner_stats()
returns table (
  slug           text,
  display_name   text,
  clicks         bigint,
  confirmed      bigint,
  pending        bigint,
  tier           text,
  next_tier      text,
  to_next_tier   int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.partners%rowtype;
  c bigint;
  n_confirmed bigint;
  n_pending bigint;
begin
  select * into p from public.partners where id = auth.uid();
  if not found then
    return;
  end if;

  select count(*) into c from public.referral_clicks where referral_clicks.slug = p.slug;
  select count(*) into n_confirmed from public.referrals
    where partner_id = p.id and status = 'confirmed';
  select count(*) into n_pending from public.referrals
    where partner_id = p.id and status = 'pending';

  return query select
    p.slug,
    p.display_name,
    c,
    n_confirmed,
    n_pending,
    case when n_confirmed >= 5 then 'Platinum'
         when n_confirmed >= 2 then 'Premium'
         else 'Basic' end,
    case when n_confirmed >= 5 then null
         when n_confirmed >= 2 then 'Platinum'
         else 'Premium' end,
    case when n_confirmed >= 5 then 0
         when n_confirmed >= 2 then (5 - n_confirmed)::int
         else (2 - n_confirmed)::int end;
end;
$$;

revoke all on function public.partner_stats() from public;
grant execute on function public.partner_stats() to authenticated;
