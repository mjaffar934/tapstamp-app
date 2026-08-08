-- Ensure nurture queue is service-role only (idempotent; 029 may have predated grants on remote)
revoke all on public.hardware_nurture_emails from anon, authenticated;
grant all on public.hardware_nurture_emails to service_role;
