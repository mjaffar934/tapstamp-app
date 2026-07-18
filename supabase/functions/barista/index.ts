import { supabase } from '../_shared/client.ts';
import { json, lastPathSegment, todayStartIso } from '../_shared/utils.ts';

const PASS_FIELDS = 'id, serial_number, customer_name, member_code, stamp_count, status, last_stamp_at, pending_milestone_reward';

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
    const memberCode = url.searchParams.get('code')?.trim();

    const { data: cafe } = await supabase
      .from('cafes')
      .select('stamp_goal, minimum_spend')
      .eq('id', cafeId)
      .single();

    const stampGoal = cafe?.stamp_goal ?? 10;
    const minimumSpend = cafe?.minimum_spend ?? null;

    if (memberCode) {
      const { data: pass, error: passError } = await supabase
        .from('passes')
        .select(PASS_FIELDS)
        .eq('cafe_id', cafeId)
        .eq('member_code', memberCode)
        .maybeSingle();

      if (passError) {
        return json({ error: passError.message }, 500);
      }

      return json({ pass: pass ?? null, stampGoal, minimumSpend });
    }

    if (serial) {
      const isMemberCode = /^\d{4}$/.test(serial);
      let query = supabase
        .from('passes')
        .select(PASS_FIELDS)
        .eq('cafe_id', cafeId);

      const { data: pass, error: passError } = isMemberCode
        ? await query.eq('member_code', serial).maybeSingle()
        : await query.ilike('serial_number', serial).maybeSingle();

      if (passError) {
        return json({ error: passError.message }, 500);
      }

      return json({ pass: pass ?? null, stampGoal, minimumSpend });
    }

    const todayStart = todayStartIso();

    const [passesResult, stampsTodayResult, rewardReadyResult] = await Promise.all([
      supabase
        .from('passes')
        .select(PASS_FIELDS)
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
        .or('status.eq.redeemed,pending_milestone_reward.not.is.null'),
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
