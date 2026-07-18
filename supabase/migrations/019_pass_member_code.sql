-- Per-customer 4-digit lookup code (unique per cafe), pass sync timestamps, redeem ack flag.

alter table public.passes
  add column if not exists member_code text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists redeem_ack_pending boolean not null default false;

create unique index if not exists passes_cafe_member_code_uidx
  on public.passes (cafe_id, member_code)
  where member_code is not null;

-- Backfill member codes for existing passes.
do $$
declare
  r record;
  new_code text;
  taken boolean;
  attempt int;
begin
  for r in select id, cafe_id from public.passes where member_code is null loop
    attempt := 0;
    loop
      attempt := attempt + 1;
      if attempt > 100 then
        raise exception 'Could not assign member_code for pass %', r.id;
      end if;
      new_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
      select exists(
        select 1 from public.passes p
        where p.cafe_id = r.cafe_id and p.member_code = new_code
      ) into taken;
      exit when not taken;
    end loop;
    update public.passes set member_code = new_code where id = r.id;
  end loop;
end $$;

alter table public.passes
  alter column member_code set not null;
