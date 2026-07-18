import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

async function authorizeOwner(
  authHeader: string | null,
  cafeId: string,
): Promise<{ ok: true; cafe: Record<string, unknown> } | { ok: false; response: Response }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) {
    return { ok: false, response: json({ error: 'Server misconfigured' }, 500) };
  }

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', cafeId)
    .maybeSingle();

  if (error || !cafe) {
    return { ok: false, response: json({ error: 'Cafe not found' }, 404) };
  }

  const email = user.email.toLowerCase();
  const cafeEmail = cafe.email ? String(cafe.email).toLowerCase() : '';
  const ownerEmail = cafe.owner_email ? String(cafe.owner_email).toLowerCase() : '';

  if (cafeEmail !== email && ownerEmail !== email) {
    return { ok: false, response: json({ error: 'Forbidden' }, 403) };
  }

  return { ok: true, cafe };
}

function parseIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const cafeId = lastPathSegment(url);

    if (!cafeId) {
      return json({ error: 'cafeId required' }, 400);
    }

    const auth = await authorizeOwner(req.headers.get('Authorization'), cafeId);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const startsAt = parseIso(body.starts_at);
    const endsAt = parseIso(body.ends_at);

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return json({ error: 'End time must be after start time' }, 400);
    }

    if (!message) {
      await supabase
        .from('cafes')
        .update({
          active_campaign_message: null,
          campaign_starts_at: null,
          campaign_ends_at: null,
        })
        .eq('id', cafeId);
      return json({ success: true, cleared: true });
    }

    await supabase
      .from('cafes')
      .update({
        active_campaign_message: message,
        campaign_starts_at: startsAt,
        campaign_ends_at: endsAt,
      })
      .eq('id', cafeId);

    // Tap page only — no Wallet push (avoids "New message" pass notifications).
    return json({
      success: true,
      message,
      startsAt,
      endsAt,
      tapPageOnly: true,
    });
  } catch (err) {
    console.error('Campaign error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
