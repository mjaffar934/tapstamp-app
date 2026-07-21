import { supabase } from '../_shared/client.ts';
import { requireCafeAuth } from '../_shared/auth.ts';
import { syncCafeWalletPasses } from '../_shared/walletSync.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

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

    const authResult = await requireCafeAuth(req.headers.get('Authorization'), cafeId);
    if (authResult instanceof Response) return authResult;

    const body = await req.json();

    const updates: Record<string, unknown> = {};
    const allowed = [
      'reward',
      'stamp_goal',
      'show_customer_name_on_pass',
      'collect_customer_details',
      'collect_name_only',
      'collect_birthday',
      'birthday_reward',
      'birthday_message',
      'double_stamp_hours',
      'welcome_message',
      'stamp_message',
      'reward_message',
      'stamp_cooldown_hours',
      'minimum_spend',
    ] as const;

    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: 'No valid fields to update' }, 400);
    }

    const { error } = await supabase.from('cafes').update(updates).eq('id', cafeId);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const walletFields = [
      'reward',
      'stamp_goal',
      'show_customer_name_on_pass',
      'welcome_message',
      'stamp_message',
      'reward_message',
    ];
    const needsWalletSync = walletFields.some((k) => k in updates);
    if (needsWalletSync) {
      const sync = syncCafeWalletPasses(cafeId).catch((err) =>
        console.error('Post-settings wallet sync:', err),
      );
      const edge = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
      if (edge?.waitUntil) edge.waitUntil(sync);
      else await sync;
    }

    return json({ success: true });
  } catch (err) {
    console.error('Settings error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
