alter table public.cafes
  add column if not exists pass_template text not null default 'classic'
    check (pass_template in ('classic', 'midnight', 'cream'));

alter table public.cafes
  add column if not exists show_customer_name_on_pass boolean not null default true;

alter table public.cafes
  add column if not exists active_campaign_message text;
