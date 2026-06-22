alter table public.businesses
  add column if not exists stripe_checkout_session_id text;

create index if not exists businesses_stripe_checkout_session_id_idx
  on public.businesses (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
