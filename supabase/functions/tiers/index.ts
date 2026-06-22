import { supabase } from '../_shared/client.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = lastPathSegment(url);

    if (!id) {
      return json({ error: 'id required' }, 400);
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('reward_tiers')
        .select('*')
        .eq('cafe_id', id)
        .order('stamp_count');

      if (error) return json({ error: error.message }, 500);
      return json(data ?? []);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.stamp_count || !body.reward) {
        return json({ error: 'stamp_count and reward required' }, 400);
      }

      const { data, error } = await supabase
        .from('reward_tiers')
        .insert({
          cafe_id: id,
          stamp_count: body.stamp_count,
          reward: body.reward,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json(data, 201);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('reward_tiers').delete().eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    console.error('Tiers error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
