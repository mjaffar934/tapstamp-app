import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { generateStaffCode } from '../_shared/staffCode.ts';
import { json, slugFromEmail } from '../_shared/utils.ts';

interface BootstrapBody {
  secret?: string;
  email?: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('DEV_BOOTSTRAP_SECRET');
  if (!expectedSecret) {
    return json({ error: 'Dev bootstrap is not enabled on this project' }, 404);
  }

  try {
    const body = await req.json() as BootstrapBody;
    if (body.secret !== expectedSecret) {
      return json({ error: 'Forbidden' }, 403);
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password || password.length < 8) {
      return json({ error: 'Email and password (min 8 chars) are required' }, 400);
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId: string | undefined;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (!msg.includes('already') && !msg.includes('registered') && !msg.includes('exists')) {
        return json({ error: createError.message }, 400);
      }

      const { data: bizByEmail } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('email', email)
        .maybeSingle();

      if (bizByEmail?.owner_id) {
        userId = bizByEmail.owner_id as string;
      } else {
        const lookupRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
          {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
          },
        );
        const lookupData = await lookupRes.json() as {
          users?: Array<{ id: string; email?: string }>;
        };
        userId = lookupData.users?.find((user) => user.email?.toLowerCase() === email)?.id;
      }

      if (!userId) {
        return json({ error: 'Account exists but could not be loaded' }, 400);
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updateError) {
        return json({ error: updateError.message }, 400);
      }
    } else {
      userId = created.user?.id;
    }

    if (!userId) {
      return json({ error: 'Failed to prepare dev account' }, 500);
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (!existingBiz) {
      const { error: bizError } = await supabase.from('businesses').insert({
        owner_id: userId,
        name: 'My Business',
        email,
        owner_name: 'Dev Owner',
        city: 'London',
        postcode: 'SW1A 1AA',
        shipping_address_line1: '1 Dev Street',
        plan_selected: 'pro',
        order_status: 'delivered',
        kit_received: true,
        onboarding_status: 'complete',
        subscription_status: 'trialing',
      });

      if (bizError) {
        return json({ error: bizError.message }, 500);
      }
    } else {
      await supabase.from('businesses').update({
        onboarding_status: 'complete',
        kit_received: true,
        order_status: 'delivered',
        plan_selected: 'pro',
        subscription_status: 'trialing',
      }).eq('owner_id', userId);
    }

    const { data: existingCafe } = await supabase
      .from('cafes')
      .select('id, staff_code')
      .eq('email', email)
      .maybeSingle();

    if (!existingCafe) {
      const { error: cafeError } = await supabase.from('cafes').insert({
        name: 'My Business',
        email,
        slug: slugFromEmail(email, `dev-${userId.slice(0, 8)}`),
        biz_type: 'cafe',
        plan: 'pro',
        trial_ends_at: trialEnds.toISOString(),
        status: 'active',
        city: 'London',
        postcode: 'SW1A 1AA',
        staff_code: generateStaffCode(),
        subscription_status: 'trialing',
      });

      if (cafeError) {
        return json({ error: cafeError.message }, 500);
      }
    } else {
      await supabase.from('cafes').update({
        plan: 'pro',
        trial_ends_at: trialEnds.toISOString(),
        subscription_status: 'trialing',
        status: 'active',
        ...(existingCafe.staff_code ? {} : { staff_code: generateStaffCode() }),
      }).eq('id', existingCafe.id);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('dev-bootstrap error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
