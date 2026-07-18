import { supabase } from '../_shared/client.ts';
import { buildPkpass } from '../_shared/pkpass.ts';
import { ensureMemberCode } from '../_shared/memberCode.ts';
import { lastPathSegment } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const serial = lastPathSegment(url);

    if (!serial) {
      return new Response('Serial number required', { status: 400 });
    }

    const { data: pass, error: passError } = await supabase
      .from('passes')
      .select('*')
      .eq('serial_number', serial)
      .single();

    if (passError || !pass) {
      return new Response('Pass not found', { status: 404 });
    }

    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', pass.cafe_id)
      .single();

    if (cafeError || !cafe) {
      return new Response('Cafe not found', { status: 404 });
    }

    const { data: tiers } = await supabase
      .from('reward_tiers')
      .select('stamp_count, reward')
      .eq('cafe_id', pass.cafe_id)
      .order('stamp_count');

    const now = new Date().toISOString();
    await supabase
      .from('passes')
      .update({
        updated_at: now,
        ...(!pass.wallet_added_at ? { wallet_added_at: now } : {}),
      })
      .eq('serial_number', serial);

    const pkpass = await buildPkpass({
      cafe,
      serialNumber: pass.serial_number,
      authToken: pass.auth_token,
      stampCount: pass.stamp_count,
      status: pass.status,
      customerName: pass.customer_name,
      memberCode: await ensureMemberCode(pass, String(pass.cafe_id)),
      lifetimeStamps: pass.lifetime_stamps,
      tiers: tiers ?? [],
      pendingMilestoneReward: pass.pending_milestone_reward ?? null,
    });

    return new Response(pkpass, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${serial}.pkpass"`,
        'Cache-Control': 'no-store',
        'Last-Modified': new Date(now).toUTCString(),
      },
    });
  } catch (err) {
    console.error('Pass error:', err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
