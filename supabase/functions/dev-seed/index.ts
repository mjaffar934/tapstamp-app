import { supabase } from '../_shared/client.ts';
import { json } from '../_shared/utils.ts';

interface SeedBody {
  secret?: string;
  email?: string;
  force?: boolean;
}

const MOCK_CUSTOMERS = [
  { name: 'Alex Chen', email: 'alex@example.com', stamps: 5, redeemed: false, daysAgo: 45 },
  { name: 'Sam Taylor', email: 'sam@example.com', stamps: 9, redeemed: false, daysAgo: 30 },
  { name: 'Jordan Lee', email: 'jordan@example.com', stamps: 10, redeemed: true, daysAgo: 20 },
  { name: 'Casey Morgan', email: 'casey@example.com', stamps: 3, redeemed: false, daysAgo: 5 },
  { name: 'Riley Brooks', email: 'riley@example.com', stamps: 7, redeemed: false, daysAgo: 3 },
  { name: 'Morgan Blake', email: 'morgan@example.com', stamps: 2, redeemed: false, daysAgo: 1 },
  { name: 'Taylor Quinn', email: 'taylor@example.com', stamps: 10, redeemed: true, daysAgo: 8 },
  { name: 'Jamie Fox', email: 'jamie@example.com', stamps: 4, redeemed: false, daysAgo: 12 },
];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function hoursAgoIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('DEV_BOOTSTRAP_SECRET');
  if (!expectedSecret) {
    return json({ error: 'Dev seed is not enabled on this project' }, 404);
  }

  try {
    const body = await req.json() as SeedBody;
    if (body.secret !== expectedSecret) {
      return json({ error: 'Forbidden' }, 403);
    }

    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return json({ error: 'Email is required' }, 400);
    }

    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('id, stamp_goal')
      .eq('email', email)
      .maybeSingle();

    if (cafeError || !cafe) {
      return json({ error: cafeError?.message ?? 'Cafe not found for this email' }, 404);
    }

    const cafeId = String(cafe.id);
    const stampGoal = Number(cafe.stamp_goal) || 10;

    if (!body.force) {
      const { count } = await supabase
        .from('passes')
        .select('id', { count: 'exact', head: true })
        .eq('cafe_id', cafeId);

      if ((count ?? 0) > 0) {
        return json({ ok: true, seeded: 0, skipped: true });
      }
    }

    let seeded = 0;

    for (const customer of MOCK_CUSTOMERS) {
      const serial = crypto.randomUUID();
      const authToken = crypto.randomUUID().replace(/-/g, '');
      const createdAt = daysAgoIso(customer.daysAgo);
      const stampCount = customer.redeemed ? stampGoal : Math.min(customer.stamps, stampGoal - 1);
      const status = customer.redeemed ? 'redeemed' : 'active';

      const { data: pass, error: passError } = await supabase
        .from('passes')
        .insert({
          cafe_id: cafeId,
          serial_number: serial,
          auth_token: authToken,
          stamp_count: stampCount,
          status,
          lifetime_stamps: stampCount + (customer.redeemed ? stampGoal : 0),
          customer_name: customer.name,
          customer_email: customer.email,
          created_at: createdAt,
          last_stamp_at: hoursAgoIso(Math.max(1, customer.daysAgo * 2)),
        })
        .select('id')
        .single();

      if (passError || !pass) {
        console.warn('dev-seed pass insert failed:', passError?.message);
        continue;
      }

      const passId = String(pass.id);

      for (let i = 0; i < stampCount; i++) {
        await supabase.from('stamps').insert({
          pass_id: passId,
          cafe_id: cafeId,
          created_at: hoursAgoIso(i * 6 + customer.daysAgo),
        });
      }

      if (customer.redeemed) {
        await supabase.from('redemptions').insert({
          pass_id: passId,
          cafe_id: cafeId,
          created_at: hoursAgoIso(2),
        });
      }

      seeded += 1;
    }

    return json({ ok: true, seeded });
  } catch (err) {
    console.error('dev-seed error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
