import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateUniqueChipCode } from '../_shared/chipCode.ts';
import { SUPABASE_URL, supabase, functionsUrl } from '../_shared/client.ts';
import { json } from '../_shared/utils.ts';

interface GenerateBody {
  secret?: string;
  count?: number;
}

function adminSecret(): string | undefined {
  return Deno.env.get('ADMIN_SECRET') ?? Deno.env.get('DEV_BOOTSTRAP_SECRET');
}

function adminEmails(): string[] {
  return (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function authorizeAdmin(req: Request, secret: string | undefined): Promise<Response | null> {
  const expected = adminSecret();
  if (!expected || secret !== expected) {
    return json({ error: 'Forbidden' }, 403);
  }

  const allowed = adminEmails();
  if (allowed.length === 0) return null;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Admin sign-in required' }, 401);
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) return json({ error: 'Server misconfigured' }, 500);

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user?.email || !allowed.includes(user.email.toLowerCase())) {
    return json({ error: 'Forbidden' }, 403);
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!adminSecret()) {
    return json({ error: 'Admin tools not enabled' }, 404);
  }

  try {
    const body = await req.json() as GenerateBody;
    const authError = await authorizeAdmin(req, body.secret);
    if (authError) return authError;

    const count = Math.min(Math.max(Number(body.count) || 1, 1), 50);

    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = await generateUniqueChipCode(async (candidate) => {
        const { data } = await supabase
          .from('chips')
          .select('id')
          .ilike('code', candidate)
          .maybeSingle();
        return Boolean(data);
      });

      const { error } = await supabase.from('chips').insert({ code });
      if (error) {
        return json({ error: error.message }, 500);
      }
      codes.push(code);
    }

    const stamps = codes.map((code) => ({
      code,
      tapUrl: functionsUrl(`/tap/${code}`),
      nfcUrl: functionsUrl(`/tap/${code}`),
    }));

    return json({ ok: true, stamps });
  } catch (err) {
    console.error('admin-generate-chips error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
