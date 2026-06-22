-- TapStamp Owner App — initial schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  business_type text,
  logo_url text,
  card_color text default '#C9A96E',
  stamps_per_reward integer not null default 10,
  created_at timestamptz not null default now(),
  unique (owner_id)
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  total_stamps integer not null default 0,
  lifetime_visits integer not null default 0,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

create table if not exists public.stamp_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  event_type text not null check (event_type in ('earn', 'redeem')),
  stamps integer not null default 1,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customers_business_id_idx on public.customers (business_id);
create index if not exists stamp_events_business_id_idx on public.stamp_events (business_id);
create index if not exists stamp_events_created_at_idx on public.stamp_events (created_at desc);
create index if not exists campaigns_business_id_idx on public.campaigns (business_id);

alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.stamp_events enable row level security;
alter table public.campaigns enable row level security;

do $$ begin
  create policy "Owners manage their business"
    on public.businesses for all
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Owners manage their customers"
    on public.customers for all
    using (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    )
    with check (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Owners manage stamp events"
    on public.stamp_events for all
    using (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    )
    with check (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Owners manage campaigns"
    on public.campaigns for all
    using (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    )
    with check (
      business_id in (select id from public.businesses where owner_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;
