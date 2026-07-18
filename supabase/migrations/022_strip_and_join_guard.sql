-- Custom strip art for wallet passes + join abuse fingerprinting
alter table public.cafes
  add column if not exists strip_image_url text;

create table if not exists public.pass_join_guards (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  fingerprint text not null,
  pass_serial text not null,
  created_at timestamptz not null default now(),
  primary key (cafe_id, fingerprint)
);

create index if not exists pass_join_guards_created_at_idx
  on public.pass_join_guards (created_at);

alter table public.pass_join_guards enable row level security;

-- Recreate dashboard stats with explicit Monday→Sunday UK week window
create or replace function public.owner_dashboard_stats(p_cafe_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  month_start timestamptz;
  week_start timestamptz;
begin
  if p_cafe_id is null or not (p_cafe_id in (select public.owner_cafe_ids())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  month_start := date_trunc('month', timezone('Europe/London', now())) at time zone 'Europe/London';
  -- ISO week: Monday 00:00 London → resets every Monday
  week_start := date_trunc('week', timezone('Europe/London', now())) at time zone 'Europe/London';

  return json_build_object(
    'total_customers', (select count(*)::int from public.passes where cafe_id = p_cafe_id),
    'new_customers_this_month', (
      select count(*)::int from public.passes
      where cafe_id = p_cafe_id and created_at >= month_start
    ),
    'stamps_this_week', (
      select count(*)::int from public.stamps
      where cafe_id = p_cafe_id and created_at >= week_start
    ),
    'redemptions_this_week', (
      select count(*)::int from public.redemptions
      where cafe_id = p_cafe_id and created_at >= week_start
    ),
    'week_starts_at', week_start
  );
end;
$$;
