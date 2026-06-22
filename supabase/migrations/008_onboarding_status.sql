alter table public.businesses
  add column if not exists onboarding_status text not null default 'ordered'
    check (onboarding_status in ('ordered', 'complete')),
  add column if not exists owner_name text,
  add column if not exists city text,
  add column if not exists postcode text;

update public.businesses set onboarding_status = 'complete' where onboarding_status = 'ordered';
