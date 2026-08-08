-- Record Wallet push/update outcomes so stamp count in DB stays trustworthy
-- when Apple/Google sync fails. Merchants see the real count; customers get
-- an honest fallback message on the tap page.
alter table public.passes
  add column if not exists last_wallet_sync_at timestamptz,
  add column if not exists last_wallet_sync_ok boolean,
  add column if not exists last_wallet_sync_error text;

comment on column public.passes.last_wallet_sync_at is
  'When Apple/Google Wallet was last notified after a stamp/redeem/settings sync.';
comment on column public.passes.last_wallet_sync_ok is
  'true if at least one Wallet channel synced (or nothing was registered to sync); false if an attempted update failed.';
comment on column public.passes.last_wallet_sync_error is
  'Short non-secret reason when last_wallet_sync_ok is false.';
