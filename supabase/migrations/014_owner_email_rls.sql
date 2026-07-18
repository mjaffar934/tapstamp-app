-- Extend owner RLS to match cafes linked by owner_email (not only email)

create or replace function public.owner_cafe_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.cafes
  where lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
     or lower(coalesce(owner_email, '')) = lower(auth.jwt() ->> 'email');
$$;

do $$ begin
  drop policy if exists "Cafe owners read passes" on public.passes;
  create policy "Cafe owners read passes"
    on public.passes for select to authenticated
    using (cafe_id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners read stamps" on public.stamps;
  create policy "Cafe owners read stamps"
    on public.stamps for select to authenticated
    using (cafe_id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners read redemptions" on public.redemptions;
  create policy "Cafe owners read redemptions"
    on public.redemptions for select to authenticated
    using (cafe_id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners manage reward tiers" on public.reward_tiers;
  create policy "Cafe owners manage reward tiers"
    on public.reward_tiers for all to authenticated
    using (cafe_id in (select public.owner_cafe_ids()))
    with check (cafe_id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners read chips" on public.chips;
  create policy "Cafe owners read chips"
    on public.chips for select to authenticated
    using (cafe_id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners read own cafe" on public.cafes;
  create policy "Cafe owners read own cafe"
    on public.cafes for select to authenticated
    using (id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;

do $$ begin
  drop policy if exists "Cafe owners update own cafe" on public.cafes;
  create policy "Cafe owners update own cafe"
    on public.cafes for update to authenticated
    using (id in (select public.owner_cafe_ids()))
    with check (id in (select public.owner_cafe_ids()));
exception when undefined_object then null;
end $$;
