alter table public.businesses
  add column if not exists pass_template text not null default 'classic'
    check (pass_template in ('classic', 'midnight', 'cream'));

alter table public.businesses
  add column if not exists background_color text;

alter table public.businesses
  add column if not exists foreground_color text;

alter table public.businesses
  add column if not exists label_color text;

alter table public.businesses
  add column if not exists show_customer_name_on_pass boolean not null default true;

alter table public.businesses
  add column if not exists email text;
