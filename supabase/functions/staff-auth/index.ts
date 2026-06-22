import { supabase } from '../_shared/client.ts';
import { json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const code = String(body.code ?? '').trim().toUpperCase();

    if (!code) {
      return json({ error: 'Staff code required' }, 400);
    }

    const { data: cafe, error } = await supabase
      .from('cafes')
      .select('id, name, status')
      .eq('staff_code', code)
      .maybeSingle();

    if (error) {
      return json({ error: error.message }, 500);
    }

    if (!cafe) {
      return json({ error: 'Invalid staff code' }, 401);
    }

    if (cafe.status === 'suspended') {
      return json({ error: 'This cafe account is suspended' }, 403);
    }

    return json({ cafeId: cafe.id, cafeName: cafe.name });
  } catch (err) {
    console.error('Staff auth error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
