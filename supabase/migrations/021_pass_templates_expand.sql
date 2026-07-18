-- Expand wallet pass templates for premium card builder
alter table public.cafes drop constraint if exists cafes_pass_template_check;

alter table public.cafes
  add constraint cafes_pass_template_check
  check (pass_template in ('classic', 'midnight', 'cream', 'espresso', 'forest'));

alter table public.businesses drop constraint if exists businesses_pass_template_check;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'pass_template'
  ) then
    alter table public.businesses
      add constraint businesses_pass_template_check
      check (pass_template in ('classic', 'midnight', 'cream', 'espresso', 'forest'));
  end if;
end $$;
