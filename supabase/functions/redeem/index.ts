import { supabase } from '../_shared/client.ts';
import { applyRedeemToPass } from '../_shared/stampPass.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

/** @deprecated Use POST /barista-action with staff auth. Kept for compatibility. */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const serialNumber = lastPathSegment(url);

    if (!serialNumber) {
      return json({ error: 'serialNumber required' }, 400);
    }

    const body = await req.json().catch(() => ({})) as { staff_code?: string };
    const staffCode = body.staff_code?.trim().toUpperCase();
    if (!staffCode) {
      return json({ error: 'staff_code required' }, 401);
    }

    const { data: pass, error: fetchError } = await supabase
      .from('passes')
      .select('*')
      .eq('serial_number', serialNumber)
      .single();

    if (fetchError || !pass) {
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

    if (cafe.staff_code?.toUpperCase() !== staffCode) {
      return json({ error: 'Forbidden' }, 403);
    }

    const result = await applyRedeemToPass(pass, cafe);
    if (!result.ok) {
      return json({ error: result.error, ...result }, 400);
    }

    return json({ success: true, ...result });
  } catch (err) {
    console.error('Redeem error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
