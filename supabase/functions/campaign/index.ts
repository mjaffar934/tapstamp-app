import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { pushPassUpdate } from '../_shared/apns.ts';
import { updateGoogleWalletObject } from '../_shared/googleWallet.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

async function authorizeOwner(
  authHeader: string | null,
  cafeId: string,
): Promise<{ ok: true; cafe: Record<string, unknown> } | { ok: false; response: Response }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) {
    return { ok: false, response: json({ error: 'Server misconfigured' }, 500) };
  }

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', cafeId)
    .maybeSingle();

  if (error || !cafe) {
    return { ok: false, response: json({ error: 'Cafe not found' }, 404) };
  }

  const email = user.email.toLowerCase();
  const cafeEmail = cafe.email ? String(cafe.email).toLowerCase() : '';
  const ownerEmail = cafe.owner_email ? String(cafe.owner_email).toLowerCase() : '';

  if (cafeEmail !== email && ownerEmail !== email) {
    return { ok: false, response: json({ error: 'Forbidden' }, 403) };
  }

  return { ok: true, cafe };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const cafeId = lastPathSegment(url);

    if (!cafeId) {
      return json({ error: 'cafeId required' }, 400);
    }

    const auth = await authorizeOwner(req.headers.get('Authorization'), cafeId);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      await supabase
        .from('cafes')
        .update({ active_campaign_message: null })
        .eq('id', cafeId);
      return json({ success: true, sent: 0, cleared: true });
    }

    await supabase
      .from('cafes')
      .update({ active_campaign_message: message })
      .eq('id', cafeId);

    const { data: passes, error } = await supabase
      .from('passes')
      .select('serial_number, stamp_count, status, customer_name, push_token')
      .eq('cafe_id', cafeId);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const cafe = { ...auth.cafe, active_campaign_message: message };
    const list = passes ?? [];
    let apnsSent = 0;

    await Promise.all(list.map(async (pass) => {
      if (pass.push_token) {
        await pushPassUpdate(pass.push_token);
        apnsSent += 1;
      }
      await updateGoogleWalletObject({
        cafe,
        serialNumber: String(pass.serial_number),
        stampCount: Number(pass.stamp_count),
        status: String(pass.status),
        customerName: pass.customer_name as string | null,
      }).catch((err) => console.error('Google Wallet campaign sync:', err));
    }));

    return json({ success: true, sent: apnsSent, totalPasses: list.length, message });
  } catch (err) {
    console.error('Campaign error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
