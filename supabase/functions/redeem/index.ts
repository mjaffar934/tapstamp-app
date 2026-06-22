import { supabase } from '../_shared/client.ts';
import { pushPassUpdate } from '../_shared/apns.ts';
import { updateGoogleWalletObject } from '../_shared/googleWallet.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const serialNumber = lastPathSegment(url);

    if (!serialNumber) {
      return json({ error: 'serialNumber required' }, 400);
    }

    const { data: pass, error: fetchError } = await supabase
      .from('passes')
      .select('id, push_token, cafe_id, serial_number, stamp_count, status, customer_name')
      .eq('serial_number', serialNumber)
      .single();

    if (fetchError || !pass) {
      return json({ error: 'Pass not found' }, 404);
    }

    const { error } = await supabase
      .from('passes')
      .update({
        stamp_count: 0,
        status: 'active',
        last_stamp_at: null,
      })
      .eq('serial_number', serialNumber);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const { data: cafe } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', pass.cafe_id)
      .single();

    await pushPassUpdate(pass.push_token);
    if (cafe) {
      await updateGoogleWalletObject({
        cafe,
        serialNumber: pass.serial_number,
        stampCount: 0,
        status: 'active',
        customerName: pass.customer_name,
      }).catch((err) => console.error('Google Wallet sync:', err));
    }

    return json({ success: true });
  } catch (err) {
    console.error('Redeem error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
