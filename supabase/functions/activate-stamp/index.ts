import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { startGoLiveTrial } from '../_shared/createOrder.ts';
import { generateStaffCode } from '../_shared/staffCode.ts';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { ensureUniqueSlug } from '../_shared/cafeSlug.ts';
import { json, slugFromEmail } from '../_shared/utils.ts';

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

    const body = await req.json() as { chip_code?: string };
    const chipCode = body.chip_code?.trim().toUpperCase();
    if (!chipCode) {
      return json({ error: 'Stamp code required' }, 400);
    }

    const email = user.email.toLowerCase();

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, onboarding_status, plan_selected')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!business) {
      return json({ error: 'No business record found' }, 404);
    }

    const { data: ownerCafe } = await supabase
      .from('cafes')
      .select('id')
      .or(`email.eq.${email},owner_email.eq.${email}`)
      .maybeSingle();

    let hasLinkedChip = false;
    if (ownerCafe?.id) {
      const { data: linkedChip } = await supabase
        .from('chips')
        .select('id')
        .eq('cafe_id', ownerCafe.id)
        .limit(1)
        .maybeSingle();
      hasLinkedChip = Boolean(linkedChip);
    }

    if (business.onboarding_status === 'complete' && hasLinkedChip) {
      return json({ error: 'Account already activated' }, 400);
    }

    const { data: chip } = await supabase
      .from('chips')
      .select('id, cafe_id')
      .ilike('code', chipCode)
      .maybeSingle();

    if (!chip) {
      return json({ error: 'Stamp not recognised. Use the TapStamp we gave you at setup.' }, 404);
    }

    if (chip.cafe_id) {
      const { data: ownerCafeMatch } = await supabase
        .from('cafes')
        .select('id')
        .or(`email.eq.${email},owner_email.eq.${email}`)
        .maybeSingle();

      if (ownerCafeMatch?.id === chip.cafe_id) {
        if (business.onboarding_status === 'pending_activation') {
          await supabase.from('businesses').update({
            email,
            onboarding_status: 'ordered',
          }).eq('owner_id', user.id);
        }
        return json({
          success: true,
          cafeId: chip.cafe_id,
          chipCode,
          alreadyLinked: true,
        });
      }

      return json({ error: 'This stamp is already linked to another business' }, 409);
    }

    const plan = business.plan_selected ?? 'starter';

    let cafeId: string;
    const { data: existingCafe } = await supabase
      .from('cafes')
      .select('id')
      .or(`email.eq.${email},owner_email.eq.${email}`)
      .maybeSingle();

    if (existingCafe?.id) {
      cafeId = existingCafe.id as string;
      await supabase.from('cafes').update({ owner_id: user.id }).eq('id', cafeId);
    } else {
      const slug = await ensureUniqueSlug(
        supabase,
        slugFromEmail(email, `cafe-${user.id.slice(0, 8)}`),
      );

      const { data: created, error: createError } = await supabase
        .from('cafes')
        .insert({
          name: business.name ?? 'My Business',
          email,
          owner_id: user.id,
          slug,
          biz_type: 'cafe',
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
    }

    await supabase.from('chips').update({ cafe_id: cafeId }).eq('id', chip.id);

    await startGoLiveTrial(user.id, cafeId);

    await supabase.from('businesses').update({
      email,
      onboarding_status: business.onboarding_status === 'complete' ? 'complete' : 'ordered',
    }).eq('owner_id', user.id);

    return json({
      success: true,
      cafeId,
      chipCode,
      trialStarted: true,
    });
  } catch (err) {
    console.error('activate-stamp error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
