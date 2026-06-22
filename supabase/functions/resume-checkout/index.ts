import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resumeCheckoutForOwner } from '../_shared/createOrder.ts';
import { json } from '../_shared/utils.ts';
import { SUPABASE_URL } from '../_shared/client.ts';

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

    const result = await resumeCheckoutForOwner(user.id);
    if (!result.ok) {
      return json({ error: result.error ?? 'Could not resume checkout' }, 400);
    }

    return json({ checkoutUrl: result.checkoutUrl });
  } catch (err) {
    console.error('Resume checkout error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
