-- Forex Passing — partner programme schema.
--
-- Run once, in the SQL editor of a FRESH Supabase project. Do not run it in the
-- prop-funding or 8amest projects.
--
-- Everything a partner can reach goes through row level security: a signed-in
-- partner reads and writes only their own row and their own referrals. Click
-- counts are written by the /r/<slug> serverless function through
-- record_click() and are never readable row-by-row from the browser — the
-- dashboard gets aggregates from partner_stats(), which only ever answers about
-- the caller.
--
-- Live project: forexpassing-partners (ref tfomiwrjzorldayxstmu, us-east-1).

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

-- Partners only READ referrals. Every row comes from sync_referral() below,
-- filed by the desk from an application that carried the partner's link. The
-- portal used to let a partner type friends in by hand: those rows had no link
-- behind them, so nothing could ever confirm them, and anyone's address could
-- be claimed. With no insert or delete policy, RLS refuses both.
drop policy if exists referrals_insert_own on public.referrals;
drop policy if exists referrals_delete_own_pending on public.referrals;

-- No policies on referral_clicks: with RLS on and nothing granted, nothing in
-- the browser can read or write it directly. Clicks come in through
-- record_click() below, which only ever appends one row for a real partner.

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

-- Supabase grants anon EXECUTE on new functions by default, not through
-- PUBLIC, so it has to be taken away by name.
revoke all on function public.partner_stats() from public, anon;
grant execute on function public.partner_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Click recording
-- ---------------------------------------------------------------------------

-- Called by the /r/<slug> serverless function with the public anon key, so no
-- service-role key has to live in Vercel. The worst anyone can do with it is
-- add a click to a partner that exists; clicks are a vanity number, and tiers
-- come from referrals we confirm by hand.
create or replace function public.record_click(p_slug text, p_ua text default null, p_referrer text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,31}$' then
    return;
  end if;
  if not exists (select 1 from public.partners where partners.slug = p_slug) then
    return;
  end if;
  insert into public.referral_clicks (slug, ua, referrer)
  values (p_slug, left(p_ua, 400), left(p_referrer, 400));
end;
$$;

revoke all on function public.record_click(text, text, text) from public;
grant execute on function public.record_click(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Referrals filed by the trading desk
-- ---------------------------------------------------------------------------

-- The desk's backend reports two moments per referred friend: the application
-- (carrying the partner's slug from /r/<slug>) and the first payout that
-- actually left. The partner no longer has to type the friend in, and nobody
-- has to flip "confirmed" by hand.
--
-- Only the service role may call it: the desk's backend holds the project's
-- secret key in its own environment. Nothing that ships to a browser can.

-- One referral per partner and friend: an applicant who applies twice, or a
-- payout reported twice, updates the row instead of adding another.
create unique index if not exists referrals_partner_email_uq
  on public.referrals (partner_id, lower(email));

create or replace function public.sync_referral(
  p_slug         text,
  p_email        text,
  p_account_size text    default null,
  p_paid         boolean default false
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_partner uuid;
  v_email   text := lower(trim(coalesce(p_email, '')));
  v_status  text;
begin
  select id into v_partner from public.partners where slug = lower(trim(coalesce(p_slug, '')));
  if v_partner is null then
    return 'no_partner';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'bad_email';
  end if;

  insert into public.referrals (partner_id, email, account_size, status, note)
  values (
    v_partner,
    v_email,
    nullif(trim(coalesce(p_account_size, '')), ''),
    case when p_paid then 'confirmed' else 'pending' end,
    case when p_paid then 'Confirmed automatically: payout released'
         else 'Added automatically from the application' end
  )
  on conflict (partner_id, lower(email)) do update set
    account_size = coalesce(public.referrals.account_size, excluded.account_size),
    -- Only ever forward, and only on a payout. A referral we rejected by hand
    -- stays rejected; nothing moves a confirmed one back to pending.
    status = case when p_paid and public.referrals.status = 'pending'
                  then 'confirmed' else public.referrals.status end,
    note   = case when p_paid and public.referrals.status = 'pending'
                  then excluded.note else public.referrals.note end
  returning status into v_status;

  return v_status;
end;
$$;

revoke all on function public.sync_referral(text, text, text, boolean) from public, anon, authenticated;
