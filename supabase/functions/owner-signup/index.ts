import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { json } from '../_shared/utils.ts';

interface SignupBody {
  email?: string;
  password?: string;
  business_name?: string;
  owner_name?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json() as SignupBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const businessName = body.business_name?.trim() || 'My Business';
    const ownerName = body.owner_name?.trim() || '';

    if (!email || !password || password.length < 8) {
      return json({ error: 'Email and password (min 8 characters) are required' }, 400);
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json({ error: 'An account with this email already exists. Sign in instead.' }, 409);
      }
      return json({ error: createError.message }, 400);
    }

    const userId = created.user?.id;
    if (!userId) {
      return json({ error: 'Failed to create account' }, 500);
    }

    const { error: bizError } = await supabase.from('businesses').insert({
      owner_id: userId,
      name: businessName,
      email,
      owner_name: ownerName || null,
      plan_selected: 'starter',
      order_status: 'delivered',
      kit_received: true,
      onboarding_status: 'pending_activation',
      subscription_status: 'none',
    });

    if (bizError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: bizError.message }, 500);
    }

    return json({ ok: true, userId });
  } catch (err) {
    console.error('owner-signup error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
