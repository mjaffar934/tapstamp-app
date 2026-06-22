import { supabase } from '../_shared/client.ts';
import { functionsUrl } from '../_shared/client.ts';
import { redirectPage, type CafeBrand } from '../_shared/html.ts';
import { isGoogleWalletConfigured } from '../_shared/googleWallet.ts';
import { lastPathSegment } from '../_shared/utils.ts';

/** Routes customers to Apple Wallet (.pkpass) or Google Wallet based on device. */
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

  let brand: CafeBrand | null = null;
  if (pass?.cafe_id) {
    const { data: cafe } = await supabase
      .from('cafes')
      .select('id, name, reward, stamp_goal, logo_url, background_color, foreground_color, label_color, welcome_message, stamp_message, reward_message')
      .eq('id', pass.cafe_id)
      .maybeSingle();
    if (cafe) brand = cafe as CafeBrand;
  }

  const isAndroid = /android/i.test(req.headers.get('user-agent') || '');
  const target = isAndroid && isGoogleWalletConfigured()
    ? functionsUrl(`/google-wallet/${serial}`)
    : functionsUrl(`/pass/${serial}`);

  const wantsHtml = !url.searchParams.has('raw') &&
    (req.headers.get('accept')?.includes('text/html') ?? true);

  if (brand && wantsHtml) {
    const title = isAndroid ? 'Adding to Google Wallet' : 'Adding to Apple Wallet';
    const subtitle = isAndroid
      ? 'Your loyalty card is opening in Google Wallet.'
      : 'Your loyalty card is opening in Apple Wallet.';
    return new Response(redirectPage(brand, title, subtitle, target), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
});
