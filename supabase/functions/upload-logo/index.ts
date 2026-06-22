import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabase, SUPABASE_URL } from '../_shared/client.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

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

    const url = new URL(req.url);
    const cafeId = lastPathSegment(url);

    if (!cafeId) {
      return json({ error: 'cafeId required' }, 400);
    }

    const { data: cafe } = await authClient
      .from('cafes')
      .select('id, email')
      .eq('id', cafeId)
      .maybeSingle();

    if (!cafe || cafe.email?.toLowerCase() !== user.email.toLowerCase()) {
      return json({ error: 'Forbidden' }, 403);
    }

    const imageData = await req.arrayBuffer();
    if (!imageData.byteLength) {
      return json({ error: 'Image body required' }, 400);
    }

    const contentType = req.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const filePath = `${cafeId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, imageData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return json({ error: uploadError.message }, 500);
    }

    const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${filePath}`;

    const { error: updateError } = await supabase
      .from('cafes')
      .update({ logo_url: logoUrl })
      .eq('id', cafeId);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ success: true, url: logoUrl });
  } catch (err) {
    console.error('Upload logo error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
