alter table public.cafes
  add column if not exists staff_code text unique;

update public.cafes
set staff_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where staff_code is null;
