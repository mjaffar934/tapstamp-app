import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { ensureCafeStaffCode, startGoLiveTrial } from '../_shared/createOrder.ts';
import { generateStaffCode } from '../_shared/staffCode.ts';
import { json, slugFromEmail } from '../_shared/utils.ts';

import { TAPSTAMP_BG, TAPSTAMP_FG, TAPSTAMP_LABEL } from '../_shared/brand.ts';

interface ProvisionBody {
  name?: string;
  biz_type?: string;
  show_customer_name_on_pass?: boolean;
  reward?: string;
  stamp_goal?: number;
  minimum_spend?: number | null;
  chip_code?: string;
  go_live?: boolean;
}

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
    if (authError || !user?.email) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json() as ProvisionBody;
    const email = user.email.toLowerCase();

    const { data: existing } = await supabase
      .from('cafes')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let cafeId = existing?.id as string | undefined;

    if (!cafeId) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('plan_selected')
        .eq('owner_id', user.id)
        .maybeSingle();

      const plan = biz?.plan_selected ?? 'starter';

      const { data: created, error: createError } = await supabase
        .from('cafes')
        .insert({
          name: body.name ?? 'My Cafe',
          email,
          slug: slugFromEmail(email, `cafe-${user.id.slice(0, 8)}`),
          biz_type: body.biz_type ?? 'cafe',
          pass_template: 'classic',
          background_color: TAPSTAMP_BG,
          foreground_color: TAPSTAMP_FG,
          label_color: TAPSTAMP_LABEL,
          show_customer_name_on_pass: body.show_customer_name_on_pass ?? true,
          reward: body.reward ?? 'Free coffee',
          stamp_goal: body.stamp_goal ?? 10,
          minimum_spend: body.minimum_spend ?? null,
          plan,
          trial_ends_at: null,
          status: 'active',
          staff_code: generateStaffCode(),
          subscription_status: 'none',
        })
        .select('id')
        .single();

      if (createError || !created) {
        return json({ error: createError?.message ?? 'Failed to create cafe' }, 500);
      }
      cafeId = created.id;
    } else {
      await supabase.from('cafes').update({
        name: body.name,
        biz_type: body.biz_type,
        show_customer_name_on_pass: body.show_customer_name_on_pass,
        ...(body.reward != null ? { reward: body.reward } : {}),
        ...(body.stamp_goal != null ? { stamp_goal: body.stamp_goal } : {}),
        ...(body.minimum_spend !== undefined ? { minimum_spend: body.minimum_spend } : {}),
      }).eq('id', cafeId);
    }

    if (body.chip_code) {
      const chipCode = body.chip_code.toUpperCase();
      const { data: chip } = await supabase
        .from('chips')
        .select('id, cafe_id')
        .ilike('code', chipCode)
        .maybeSingle();

      if (chip && !chip.cafe_id) {
        await supabase.from('chips').update({ cafe_id: cafeId }).eq('id', chip.id);
      } else if (chip && chip.cafe_id && chip.cafe_id !== cafeId) {
        return json({ error: 'This stamp is already linked to another business' }, 409);
      } else if (!chip) {
        return json({ error: 'Stamp not recognised. Hold it under the top of your phone and try again.' }, 404);
      }

      // Trial starts on first NFC stamp link — not when skipping setup.
      await startGoLiveTrial(user.id, cafeId);
    }

    const onboardingComplete = Boolean(body.chip_code || body.go_live);

    await supabase.from('businesses').update({
      email,
      show_customer_name_on_pass: body.show_customer_name_on_pass,
      business_type: body.biz_type,
      ...(onboardingComplete ? { onboarding_status: 'complete' } : {}),
    }).eq('owner_id', user.id);

    const staffCode = await ensureCafeStaffCode(cafeId);

    return json({ success: true, cafeId, staffCode, trialStarted: Boolean(body.chip_code) });
  } catch (err) {
    console.error('Provision cafe error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
