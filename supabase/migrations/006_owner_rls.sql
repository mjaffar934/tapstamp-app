-- Allow authenticated cafe owners (matched by email) to read/write loyalty data

do $$ begin
  create policy "Cafe owners read passes"
    on public.passes for select to authenticated
    using (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners read stamps"
    on public.stamps for select to authenticated
    using (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners read redemptions"
    on public.redemptions for select to authenticated
    using (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners manage reward tiers"
    on public.reward_tiers for all to authenticated
    using (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    )
    with check (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners read chips"
    on public.chips for select to authenticated
    using (
      cafe_id in (
        select id from public.cafes
        where email is not null and lower(email) = lower(auth.jwt() ->> 'email')
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners insert cafe"
    on public.cafes for insert to authenticated
    with check (lower(email) = lower(auth.jwt() ->> 'email'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners read own cafe"
    on public.cafes for select to authenticated
    using (lower(email) = lower(auth.jwt() ->> 'email'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners update own cafe"
    on public.cafes for update to authenticated
    using (lower(email) = lower(auth.jwt() ->> 'email'))
    with check (lower(email) = lower(auth.jwt() ->> 'email'));
exception when duplicate_object then null;
end $$;
