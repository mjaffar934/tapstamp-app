import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { parsePlanId, type PlanId } from '../_shared/plans.ts';
import { json } from '../_shared/utils.ts';

interface CreateClientBody {
  secret?: string;
  email?: string;
  password?: string;
  business_name?: string;
  owner_name?: string;
  plan?: string;
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
  if (!anonKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user?.email) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (!allowed.includes(user.email.toLowerCase())) {
    return json({ error: 'Forbidden' }, 403);
  }

  return null;
}

async function resolveUserId(
  admin: ReturnType<typeof createClient>,
  serviceKey: string,
  email: string,
  password: string,
): Promise<{ userId?: string; error?: string }> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!createError) {
    return { userId: created.user?.id };
  }

  const msg = createError.message.toLowerCase();
  if (!msg.includes('already') && !msg.includes('registered') && !msg.includes('exists')) {
    return { error: createError.message };
  }

  const { data: bizByEmail } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('email', email)
    .maybeSingle();

  let userId = bizByEmail?.owner_id as string | undefined;

  if (!userId) {
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
    userId = lookupData.users?.find((u) => u.email?.toLowerCase() === email)?.id;
  }

  if (!userId) {
    return { error: 'Account exists but could not be loaded' };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    return { error: updateError.message };
  }

  return { userId };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!adminSecret()) {
    return json({ error: 'Admin provisioning is not enabled' }, 404);
  }

  try {
    const body = await req.json() as CreateClientBody;
    const authError = await authorizeAdmin(req, body.secret);
    if (authError) return authError;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const businessName = body.business_name?.trim() || 'My Business';
    const ownerName = body.owner_name?.trim() || '';
    const plan = parsePlanId(body.plan) as PlanId;

    if (!email || !password || password.length < 8) {
      return json({ error: 'Email and password (min 8 characters) are required' }, 400);
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { userId, error: userError } = await resolveUserId(admin, serviceKey, email, password);
    if (userError || !userId) {
      return json({ error: userError ?? 'Failed to create user' }, 400);
    }

    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingBiz) {
      await supabase.from('businesses').update({
        name: businessName,
        email,
        owner_name: ownerName,
        plan_selected: plan,
        order_status: 'delivered',
        kit_received: true,
        onboarding_status: 'pending_activation',
      }).eq('owner_id', userId);

      return json({
        ok: true,
        userId,
        businessId: existingBiz.id,
        updated: true,
      });
    }

    const { data: createdBiz, error: bizError } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        name: businessName,
        email,
        owner_name: ownerName,
        plan_selected: plan,
        order_status: 'delivered',
        kit_received: true,
        onboarding_status: 'pending_activation',
        subscription_status: 'none',
      })
      .select('id')
      .single();

    if (bizError || !createdBiz) {
      return json({ error: bizError?.message ?? 'Failed to create business' }, 500);
    }

    return json({
      ok: true,
      userId,
      businessId: createdBiz.id,
    });
  } catch (err) {
    console.error('admin-create-client error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
