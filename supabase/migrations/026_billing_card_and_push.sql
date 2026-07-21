-- Card-on-file for Starter auto-upgrade + owner push tokens for billing alerts
alter table public.businesses
  add column if not exists billing_card_added_at timestamptz,
  add column if not exists expo_push_token text;

create index if not exists businesses_expo_push_token_idx
  on public.businesses (expo_push_token)
  where expo_push_token is not null;
