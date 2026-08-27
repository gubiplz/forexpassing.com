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

-- ---------------------------------------------------------------------------
-- Leady
-- ---------------------------------------------------------------------------
--
-- Do 2026-08 jedynym trwałym zapisem zgłoszenia był `console.log` w funkcji
-- serwerowej i wiersz w arkuszu Google, który przy awarii cichł. Awaria
-- powiadomień na Telegramie przeszła niezauważona przez tydzień, bo nie było
-- czego z czym porównać. Ta tabela jest źródłem prawdy: lead ląduje tu ZANIM
-- poleci gdziekolwiek indziej, a każde dostarczenie zostawia własny znacznik.
--
-- Zero polityk przy włączonym RLS — jak referral_clicks. Czyta i pisze tylko
-- klucz serwisowy z funkcji Vercela; z przeglądarki nie da się tego dotknąć,
-- a leady to dane osobowe.

create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  -- Klucz idempotencji z przeglądarki: jeden na wypełnienie formularza, nie na
  -- kliknięcie „wyślij". Ponowna próba po zerwanej sieci niesie ten sam, więc
  -- jest tym samym leadem, a nie drugim.
  submission_id  text unique,
  created_at     timestamptz not null default now(),

  name           text not null,
  email          text not null,
  phone          text,
  -- Same cyfry, liczone przez bazę. Wyszukiwarka i wykrywanie dubli muszą
  -- działać niezależnie od tego, czy ktoś wpisał „+48 601-234-567" czy
  -- „601234567", a porównywanie formatów w kodzie zawsze którymś przegapi.
  phone_digits   text generated always as
                   (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored,
  phone_iso      text,
  telegram       text,
  country        text,
  ref            text,
  source         text not null,
  outcome        text not null check (outcome in ('qualified', 'not_qualified')),

  -- Werdykt gradera (api/_lib/lead-quality.js). tier/score wyciągnięte obok
  -- pełnego JSON-a, bo po nich się sortuje i filtruje.
  tier           text,
  score          int,
  quality        jsonb,
  answers        jsonb not null default '{}'::jsonb,
  -- utm_*, fbclid, ttclid — bez tego nie da się powiedzieć, która kampania
  -- przyniosła klienta, a nie tylko kliknięcie.
  attribution    jsonb not null default '{}'::jsonb,

  ip             text,
  ua             text,

  -- Praca działu. 'dropped' to zgłoszenia zatrzymane przez pułapki i walidację:
  -- wcześniej znikały bez śladu, teraz są wierszem, który da się obejrzeć.
  status         text not null default 'new'
                   check (status in ('new', 'claimed', 'contacted', 'booked',
                                     'won', 'lost', 'spam', 'dropped')),
  owner          text,
  note           text,
  lost_reason    text,
  followup_at    timestamptz,
  claimed_at     timestamptz,
  first_contact_at timestamptz,
  -- To samo zgłoszenie drugi raz w krótkim odstępie. Wiersz zostaje (nic nie
  -- kasujemy), ale dział dostaje jedną kartę zamiast dwóch.
  duplicate_of   uuid references public.leads (id) on delete set null,

  -- Dowody dostarczenia. NULL w notified_at JEST kolejką ponowień watchdoga.
  notified_at    timestamptz,
  notify_attempts int not null default 0,
  notify_error   text,
  notify_chat_id text,
  notify_msg_id  bigint,
  sheet_at       timestamptz,
  webhook_at     timestamptz,

  -- Miękkie kasowanie: „usunąłem nie ten wiersz" musi dać się cofnąć.
  deleted_at     timestamptz
);

-- Kolejka robocza panelu: najstarszy nieobsłużony na górze.
create index if not exists leads_open_idx on public.leads (created_at)
  where deleted_at is null and status in ('new', 'claimed', 'contacted');
-- Kolejka ponowień watchdoga.
create index if not exists leads_unnotified_idx on public.leads (created_at)
  where notified_at is null and deleted_at is null;
create index if not exists leads_email_idx on public.leads (lower(email));
create index if not exists leads_phone_digits_idx on public.leads (phone_digits);
create index if not exists leads_followup_idx on public.leads (followup_at)
  where followup_at is not null and deleted_at is null;

-- Kto co zrobił i kiedy. Bez tego „przecież dzwoniłem" jest nie do sprawdzenia.
create table if not exists public.lead_events (
  id       bigserial primary key,
  lead_id  uuid not null references public.leads (id) on delete cascade,
  at       timestamptz not null default now(),
  actor    text not null,
  action   text not null,
  detail   jsonb
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, at desc);

-- Raport panelu (/desk?view=report).
--
-- Liczone w bazie, nie w Node: raport za kwartał to kilka tysięcy wierszy, a
-- funkcja serwerowa musiałaby ściągnąć je wszystkie po to, żeby zwrócić
-- kilkanaście liczb. Tu wraca dokładnie tyle, ile widać na ekranie.
--
-- Mediana, nie średnia: jeden lead odebrany po trzech dniach urlopu podnosi
-- średnią tak, że przestaje opisywać cokolwiek. Mediana mówi, ile trwa
-- typowy pierwszy kontakt — a to jest miara, którą ten panel ma poprawiać.
create or replace function public.lead_report(od timestamptz, wymiar text default 'source')
returns table (
  klucz            text,
  leadow           bigint,
  kupilo           bigint,
  przegranych      bigint,
  w_obsludze       bigint,
  mediana_kontaktu numeric,
  bez_kontaktu     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(case when wymiar = 'campaign'
                         then l.attribution ->> 'utm_campaign'
                         else l.source end, ''), '(brak)') as klucz,
    count(*),
    count(*) filter (where l.status = 'won'),
    count(*) filter (where l.status = 'lost'),
    count(*) filter (where l.status in ('new', 'claimed', 'contacted', 'booked')),
    round(
      percentile_cont(0.5) within group (
        order by extract(epoch from (l.first_contact_at - l.created_at)) / 60
      )::numeric,
      1
    ),
    count(*) filter (where l.first_contact_at is null)
  from public.leads l
  where l.deleted_at is null
    and l.status <> 'dropped'
    and l.created_at >= od
  group by 1
  order by 2 desc;
$$;

-- Dlaczego przegrywamy. Bez tego raport odpowiada „ilu", a nie „dlaczego".
create or replace function public.lead_lost_reasons(od timestamptz)
returns table (powod text, ile bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(lost_reason, ''), '(nie podano)'), count(*)
  from public.leads
  where deleted_at is null and status = 'lost' and created_at >= od
  group by 1
  order by 2 desc;
$$;

-- RLS nie chroni funkcji `security definer`, więc odbieramy je rolom
-- przeglądarkowym wprost. Raport czyta wyłącznie klucz serwisowy, tak jak
-- wszystko inne w tych dwóch tabelach.
revoke all on function public.lead_report(timestamptz, text) from anon, authenticated;
revoke all on function public.lead_lost_reasons(timestamptz) from anon, authenticated;

alter table public.leads       enable row level security;
alter table public.lead_events enable row level security;
