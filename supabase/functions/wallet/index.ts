import { supabase } from '../_shared/client.ts';
import { functionsUrl } from '../_shared/client.ts';
import { isGoogleWalletConfigured } from '../_shared/googleWallet.ts';
import { lastPathSegment } from '../_shared/utils.ts';

/** Routes customers directly to Apple (.pkpass) or Google Wallet — no HTML hop. */
Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const serial = lastPathSegment(url);
  if (!serial) {
    return new Response('Serial required', { status: 400 });
  }

  const { data: pass } = await supabase
    .from('passes')
    .select('cafe_id')
    .eq('serial_number', serial)
    .maybeSingle();

  if (!pass) {
    return new Response('Pass not found', { status: 404 });
  }

  const isAndroid = /android/i.test(req.headers.get('user-agent') || '');
  const target = isAndroid && isGoogleWalletConfigured()
    ? functionsUrl(`/google-wallet/${serial}`)
    : functionsUrl(`/pass/${serial}`);

  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
});
