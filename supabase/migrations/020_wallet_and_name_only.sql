alter table public.passes
  add column if not exists wallet_added_at timestamptz;

alter table public.cafes
  add column if not exists collect_name_only boolean not null default false;
