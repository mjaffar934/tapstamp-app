import { supabase } from '../_shared/client.ts';
import { buildStampStripPng } from '../_shared/stampStrip.ts';
import { resolvePassColors } from '../_shared/passTemplates.ts';
import { lastPathSegment } from '../_shared/utils.ts';
import { stripSegmentProgress } from '../_shared/walletDisplay.ts';

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
      .select('stamp_count, status, cafe_id, pending_milestone_reward')
      .eq('serial_number', serial)
      .single();

    if (!pass) {
      return new Response('Not found', { status: 404 });
    }

    const [{ data: cafe }, { data: tiers }] = await Promise.all([
      supabase
        .from('cafes')
        .select('stamp_goal, pass_template, background_color, foreground_color, label_color')
        .eq('id', pass.cafe_id)
        .single(),
      supabase
        .from('reward_tiers')
        .select('stamp_count, reward')
        .eq('cafe_id', pass.cafe_id)
        .order('stamp_count'),
    ]);

    const stampGoal = Number(cafe?.stamp_goal) || 10;
    const isRedeemed = pass.status === 'redeemed';
    const pending = Boolean(pass.pending_milestone_reward);
    const isComplete = !isRedeemed && Number(pass.stamp_count) >= stampGoal;
    const colors = resolvePassColors(cafe ?? {});
    const redeemVisual = isRedeemed || isComplete || pending;
    const segment = stripSegmentProgress(
      Number(pass.stamp_count),
      stampGoal,
      tiers ?? [],
      { complete: redeemVisual, redeemed: redeemVisual },
    );
    const png = await buildStampStripPng(
      750,
      246,
      segment.filled,
      Math.max(1, segment.total),
      false,
      { background: colors.backgroundColor, foreground: colors.foregroundColor },
      false,
    );

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    console.error('wallet-strip error:', err);
    return new Response('Error', { status: 500 });
  }
});
