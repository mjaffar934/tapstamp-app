import { supabase } from '../_shared/client.ts';
import { buildStampStripPng } from '../_shared/stampStrip.ts';
import { lastPathSegment } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const serial = lastPathSegment(new URL(req.url));
    if (!serial) {
      return new Response('Serial required', { status: 400 });
    }

    const { data: pass } = await supabase
      .from('passes')
      .select('stamp_count, status, cafe_id')
      .eq('serial_number', serial)
      .single();

    if (!pass) {
      return new Response('Not found', { status: 404 });
    }

    const { data: cafe } = await supabase
      .from('cafes')
      .select('stamp_goal')
      .eq('id', pass.cafe_id)
      .single();

    const stampGoal = Number(cafe?.stamp_goal) || 10;
    const isRedeemed = pass.status === 'redeemed';
    const png = await buildStampStripPng(750, 246, pass.stamp_count, stampGoal, isRedeemed);

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('wallet-strip error:', err);
    return new Response('Error', { status: 500 });
  }
});
