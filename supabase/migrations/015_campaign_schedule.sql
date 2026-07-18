alter table public.cafes
  add column if not exists campaign_starts_at timestamptz,
  add column if not exists campaign_ends_at timestamptz;
