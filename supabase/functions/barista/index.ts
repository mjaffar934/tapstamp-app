import { supabase } from '../_shared/client.ts';
import { json, lastPathSegment, todayStartIso } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const cafeId = lastPathSegment(url);

    if (!cafeId) {
      return json({ error: 'cafeId required' }, 400);
    }

    const serial = url.searchParams.get('serial')?.trim().toLowerCase();

    const { data: cafe } = await supabase
      .from('cafes')
      .select('stamp_goal, minimum_spend')
      .eq('id', cafeId)
      .single();

    const stampGoal = cafe?.stamp_goal ?? 10;
    const minimumSpend = cafe?.minimum_spend ?? null;

    if (serial) {
      const { data: pass, error: passError } = await supabase
        .from('passes')
        .select('id, serial_number, customer_name, stamp_count, status, last_stamp_at')
        .eq('cafe_id', cafeId)
        .ilike('serial_number', serial)
        .maybeSingle();

      if (passError) {
        return json({ error: passError.message }, 500);
      }

      return json({ pass: pass ?? null, stampGoal, minimumSpend });
    }

    const todayStart = todayStartIso();

    const [passesResult, stampsTodayResult, rewardReadyResult] = await Promise.all([
      supabase
        .from('passes')
        .select('id, serial_number, customer_name, stamp_count, status, last_stamp_at')
        .eq('cafe_id', cafeId)
        .order('last_stamp_at', { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from('stamps')
        .select('id', { count: 'exact', head: true })
        .eq('cafe_id', cafeId)
        .gte('created_at', todayStart),
      supabase
        .from('passes')
        .select('id', { count: 'exact', head: true })
        .eq('cafe_id', cafeId)
        .eq('status', 'redeemed'),
    ]);

    if (passesResult.error) {
      return json({ error: passesResult.error.message }, 500);
    }

    return json({
      passes: passesResult.data ?? [],
      stampsToday: stampsTodayResult.count ?? 0,
      rewardReady: rewardReadyResult.count ?? 0,
      stampGoal,
      minimumSpend,
    });
  } catch (err) {
    console.error('Barista error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
