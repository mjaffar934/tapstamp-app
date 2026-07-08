import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { applyRedeemToPass, applyStampToPass } from '../_shared/stampPass.ts';
import { json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const serialNumber = body.serial_number as string | undefined;
    const action = body.action as 'stamp' | 'redeem' | undefined;
    const staffCode = body.staff_code as string | undefined;
    const verifiedSpend = body.verified_spend != null ? Number(body.verified_spend) : null;

    if (!serialNumber || !action) {
      return json({ error: 'serial_number and action required' }, 400);
    }

    const { data: pass } = await supabase
      .from('passes')
      .select('*')
      .eq('serial_number', serialNumber)
      .single();

    if (!pass) {
      return json({ error: 'Pass not found' }, 404);
    }

    const { data: cafe } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', pass.cafe_id)
      .single();

    if (!cafe) {
      return json({ error: 'Cafe not found' }, 404);
    }

    let authorized = false;

    if (staffCode) {
      authorized = cafe.staff_code?.toUpperCase() === staffCode.trim().toUpperCase();
    } else {
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

      authorized = cafe.email?.toLowerCase() === user.email.toLowerCase()
        || cafe.owner_email?.toLowerCase() === user.email.toLowerCase();
    }

    if (!authorized) {
      return json({ error: 'Forbidden' }, 403);
    }

    if (action === 'stamp') {
      const minSpend = Number(cafe.minimum_spend);
      if (Number.isFinite(minSpend) && minSpend > 0) {
        if (verifiedSpend == null || !Number.isFinite(verifiedSpend)) {
          return json({ error: 'verified_spend required', minimumSpend: minSpend }, 400);
        }
        if (verifiedSpend < minSpend) {
          return json({ error: 'below_minimum', minimumSpend: minSpend }, 400);
        }
      }
    }

    const result = action === 'redeem'
      ? await applyRedeemToPass(pass, cafe)
      : await applyStampToPass(cafe, pass);

    if (!result.ok) {
      return json({ error: result.error, ...result }, 400);
    }

    return json({ success: true, ...result });
  } catch (err) {
    console.error('Barista action error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
