import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getStripe } from '../_shared/stripe.ts';
import { json } from '../_shared/utils.ts';
import { supabase, SUPABASE_URL } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({}, 204);
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const authClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.id) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body: { confirm?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (body.confirm !== 'DELETE') {
      return json({ error: 'Confirmation required' }, 400);
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id, stripe_customer_id, stripe_subscription_id, logo_url')
      .eq('owner_id', user.id)
      .maybeSingle();

    const { data: cafes } = await supabase
      .from('cafes')
      .select('id, logo_url')
      .eq('owner_id', user.id);

    // Cancel Stripe subscription immediately when present (best-effort).
    if (business?.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(business.stripe_subscription_id);
      } catch (err) {
        console.error('Stripe cancel on delete-account:', err);
      }
    }

    // Remove cafe loyalty data first — owner_id is ON DELETE SET NULL, not CASCADE.
    if (cafes?.length) {
      const cafeIds = cafes.map((c) => c.id);
      const { error: cafeDeleteError } = await supabase
        .from('cafes')
        .delete()
        .in('id', cafeIds);
      if (cafeDeleteError) {
        console.error('Cafe delete error:', cafeDeleteError);
        return json({ error: 'Could not delete business data' }, 500);
      }
    }

    if (business?.id) {
      const { error: businessDeleteError } = await supabase
        .from('businesses')
        .delete()
        .eq('id', business.id);
      if (businessDeleteError) {
        console.error('Business delete error:', businessDeleteError);
        return json({ error: 'Could not delete account data' }, 500);
      }
    }

    // Best-effort storage cleanup — ignore failures.
    try {
      const paths: string[] = [];
      for (const cafe of cafes ?? []) {
        const url = cafe.logo_url;
        if (typeof url === 'string' && url.includes('/storage/v1/object/public/')) {
          const after = url.split('/storage/v1/object/public/')[1];
          if (after) {
            const slash = after.indexOf('/');
            if (slash > 0) paths.push(after.slice(slash + 1));
          }
        }
      }
      if (paths.length) {
        await supabase.storage.from('logos').remove(paths).catch(() => {});
      }
    } catch {
      // ignore storage cleanup errors
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error('Auth deleteUser error:', deleteUserError);
      return json({ error: 'Could not delete auth user' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('delete-account error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
