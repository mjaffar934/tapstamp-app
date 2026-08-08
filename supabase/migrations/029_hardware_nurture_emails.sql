-- Offer A Day 0/2/7 NFC → loyalty nurture queue (hardware_shop paid only).
-- Buyer email is stored for delivery; application logs must never print raw emails.

create table if not exists public.hardware_nurture_emails (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null,
  buyer_email text not null,
  business_name text,
  nfc_sku text,
  email_day smallint not null check (email_day in (0, 2, 7)),
  send_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed', 'suppressed')),
  provider_message_id text,
  error_detail text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (stripe_checkout_session_id, email_day)
);

create index if not exists hardware_nurture_emails_due_idx
  on public.hardware_nurture_emails (send_at)
  where status = 'pending';

create index if not exists hardware_nurture_emails_buyer_email_idx
  on public.hardware_nurture_emails (buyer_email);

alter table public.hardware_nurture_emails enable row level security;

-- Service role only (edge functions). No anon/authenticated policies on purpose.
revoke all on public.hardware_nurture_emails from anon, authenticated;
grant all on public.hardware_nurture_emails to service_role;
