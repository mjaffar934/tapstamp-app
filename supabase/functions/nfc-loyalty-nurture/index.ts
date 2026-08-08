import { processDueNurtureEmails } from '../_shared/nfcLoyaltyNurture.ts';
import { isNurtureEmailEnabled } from '../_shared/email.ts';

/**
 * Cron / ops worker for Offer A Day 2 + Day 7 (and any overdue Day 0).
 * Auth: Authorization: Bearer <NFC_NURTURE_CRON_SECRET> or service role JWT.
 */
function authorized(req: Request): boolean {
  const header = req.headers.get('Authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!bearer) return false;

  const cronSecret = (
    Deno.env.get('NFC_NURTURE_CRON_SECRET')
    ?? Deno.env.get('HARDWARE_NURTURE_CRON_SECRET')
    ?? ''
  ).trim();
  if (cronSecret && bearer === cronSecret) return true;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (serviceKey && bearer === serviceKey) return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'GET' && new URL(req.url).searchParams.get('diag') === '1') {
    return Response.json({
      ok: true,
      enabled: isNurtureEmailEnabled(),
      resendConfigured: Boolean(
        (Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('EMAIL_API_KEY') ?? '').trim(),
      ),
      from: Deno.env.get('EMAIL_FROM') ? 'set' : 'default',
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!authorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await processDueNurtureEmails(50);
  return Response.json({ ok: true, enabled: isNurtureEmailEnabled(), ...stats });
});
