-- TapStamp NFC loyalty schema (cafes, chips, passes, tiers)

create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,
  reward text not null default 'Free coffee',
  stamp_goal integer not null default 10,
  biz_type text,
  background_color text default 'rgb(26,24,20)',
  foreground_color text default 'rgb(201,169,110)',
  label_color text default 'rgb(201,169,110)',
  logo_url text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  plan text not null default 'trial' check (plan in ('trial', 'paid')),
  trial_ends_at timestamptz,
  collect_customer_details boolean not null default false,
  collect_birthday boolean not null default false,
  birthday_reward text,
  birthday_message text,
  double_stamp_hours jsonb not null default '[]'::jsonb,
  welcome_message text,
  stamp_message text,
  reward_message text,
  stamp_cooldown_hours integer not null default 4,
  created_at timestamptz not null default now()
);

create table if not exists public.chips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  cafe_id uuid references public.cafes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.passes (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  serial_number text not null unique,
  auth_token text not null,
  stamp_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'redeemed')),
  last_stamp_at timestamptz,
  lifetime_stamps integer not null default 0,
  unlocked_tiers uuid[] not null default '{}',
  push_token text,
  device_id text,
  customer_name text,
  customer_email text,
  birthday date,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  stamp_count integer not null,
  reward text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stamps (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references public.passes (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references public.passes (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists passes_cafe_id_idx on public.passes (cafe_id);
create index if not exists passes_last_stamp_at_idx on public.passes (last_stamp_at desc nulls last);
create index if not exists stamps_cafe_id_created_at_idx on public.stamps (cafe_id, created_at desc);
create index if not exists reward_tiers_cafe_id_idx on public.reward_tiers (cafe_id);

alter table public.cafes enable row level security;
alter table public.chips enable row level security;
alter table public.passes enable row level security;
alter table public.reward_tiers enable row level security;
alter table public.stamps enable row level security;
alter table public.redemptions enable row level security;

-- Edge functions use service role; no public policies required for server-side access.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;
