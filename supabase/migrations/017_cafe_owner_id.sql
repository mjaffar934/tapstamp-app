-- Link cafes to auth users so owner app RLS + dashboard stats resolve reliably.

alter table public.cafes
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

alter table public.cafes
  add column if not exists owner_email text;

create index if not exists cafes_owner_id_idx on public.cafes (owner_id);

-- Backfill owner_id from businesses that share the same login email.
update public.cafes c
set owner_id = b.owner_id
from public.businesses b
where c.owner_id is null
  and b.email is not null
  and lower(c.email) = lower(b.email);

create or replace function public.owner_cafe_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.cafes
  where owner_id = auth.uid()
     or lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
     or lower(coalesce(owner_email, '')) = lower(auth.jwt() ->> 'email');
$$;

grant execute on function public.owner_cafe_ids() to authenticated;

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

  month_start := date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London';
  week_start := date_trunc('week', now() at time zone 'Europe/London') at time zone 'Europe/London';

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
    )
  );
end;
$$;

grant execute on function public.owner_dashboard_stats(uuid) to authenticated;
