-- Allow pending_activation before stamp NFC link
alter table public.businesses drop constraint if exists businesses_onboarding_status_check;

alter table public.businesses
  add constraint businesses_onboarding_status_check
  check (onboarding_status in ('pending_activation', 'ordered', 'complete'));
