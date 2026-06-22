alter table public.cafes
  add column if not exists minimum_spend numeric;

alter table public.cafes
  add column if not exists email text;

-- Allow authenticated cafe owners to manage settings by matching email
do $$ begin
  create policy "Cafe owners read by email"
    on public.cafes for select
    to authenticated
    using (email is not null and lower(email) = lower(auth.jwt() ->> 'email'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Cafe owners update by email"
    on public.cafes for update
    to authenticated
    using (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    with check (email is not null and lower(email) = lower(auth.jwt() ->> 'email'));
exception when duplicate_object then null;
end $$;
