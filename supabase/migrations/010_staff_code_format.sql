-- Regenerate staff codes in the readable 6-char format for all cafes

create extension if not exists pgcrypto;

do $$
declare
  r record;
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  valid boolean;
begin
  for r in select id, staff_code from public.cafes loop
    valid := r.staff_code is not null
      and length(r.staff_code) = 6
      and r.staff_code ~ '^[A-Z2-9]{6}$';

    if not valid then
      new_code := '';
      for i in 1..6 loop
        new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
      end loop;
      update public.cafes set staff_code = new_code where id = r.id;
    end if;
  end loop;

  -- Resolve collisions
  for r in
    select id from public.cafes c1
    where exists (
      select 1 from public.cafes c2
      where c2.staff_code = c1.staff_code and c2.id <> c1.id
    )
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    update public.cafes set staff_code = new_code where id = r.id;
  end loop;
end $$;

alter table public.cafes
  alter column staff_code set not null;
