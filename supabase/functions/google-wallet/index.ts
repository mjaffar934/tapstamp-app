import { supabase } from '../_shared/client.ts';
import {
  buildGoogleWalletSaveUrl,
  isGoogleWalletConfigured,
} from '../_shared/googleWallet.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    if (!isGoogleWalletConfigured()) {
      return json({
        error: 'Google Wallet not configured',
        hint: 'Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT, and GOOGLE_WALLET_PRIVATE_KEY',
      }, 501);
    }

    const url = new URL(req.url);
    const serial = lastPathSegment(url);
    if (!serial) {
      return json({ error: 'Serial number required' }, 400);
    }

    const { data: pass } = await supabase
      .from('passes')
      .select('*')
      .eq('serial_number', serial)
      .single();

    if (!pass) {
      return json({ error: 'Pass not found' }, 404);
    }

    const { data: cafe } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', pass.cafe_id)
      .single();

    if (!cafe) {
      return json({ error: 'Cafe not found' }, 404);
    }

    const { data: tiers } = await supabase
      .from('reward_tiers')
      .select('stamp_count, reward')
      .eq('cafe_id', pass.cafe_id)
      .order('stamp_count');

    const saveUrl = buildGoogleWalletSaveUrl({
      cafe,
      serialNumber: pass.serial_number,
      stampCount: pass.stamp_count,
      status: pass.status,
      customerName: pass.customer_name,
      lifetimeStamps: pass.lifetime_stamps,
      tiers: tiers ?? [],
      pendingMilestoneReward: pass.pending_milestone_reward ?? null,
    });

    const format = url.searchParams.get('format');
    if (format === 'json') {
      return json({ saveUrl });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: saveUrl },
    });
  } catch (err) {
    console.error('Google Wallet error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
