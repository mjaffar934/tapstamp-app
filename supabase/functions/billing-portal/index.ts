import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createBillingPortalSession } from '../_shared/subscription.ts';
import { json } from '../_shared/utils.ts';
import { supabase, SUPABASE_URL } from '../_shared/client.ts';

const WEBSITE = Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
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

    const { data: business } = await supabase
      .from('businesses')
      .select('stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!business?.stripe_customer_id) {
      return json({ error: 'No billing account found. Complete your kit order first.' }, 400);
    }

    const portalUrl = await createBillingPortalSession(
      business.stripe_customer_id,
      WEBSITE,
    );

    return json({ portalUrl });
  } catch (err) {
    console.error('Billing portal error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
