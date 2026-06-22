import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { supabase } from '../_shared/client.ts';
import { signCafeToken } from '../_shared/jwt.ts';
import { json } from '../_shared/utils.ts';

interface ActivateBody {
  chip: string;
  name: string;
  email: string;
  password: string;
  reward?: string;
  stamp_goal?: number;
  biz_type?: string;
  background_color?: string;
  foreground_color?: string;
  label_color?: string;
  pass_template?: string;
  show_customer_name_on_pass?: boolean;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json() as ActivateBody;
    const chipCode = body.chip?.toUpperCase();

    if (!chipCode || !body.name || !body.email || !body.password) {
      return json({ error: 'chip, name, email, and password are required' }, 400);
    }

    const { data: chip } = await supabase
      .from('chips')
      .select('*')
      .eq('code', chipCode)
      .single();

    if (!chip) {
      return json({ error: 'Invalid chip code' }, 404);
    }

    if (chip.cafe_id) {
      return json({ error: 'Chip already activated' }, 409);
    }

    const passwordHash = await hash(body.password);
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    const email = body.email.toLowerCase();

    const { data: business } = await supabase
      .from('businesses')
      .select('pass_template, background_color, foreground_color, label_color, show_customer_name_on_pass, business_type, name')
      .eq('email', email)
      .maybeSingle();

    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .insert({
        name: body.name || business?.name || 'My Cafe',
        email,
        password_hash: passwordHash,
        reward: body.reward ?? 'Free coffee',
        stamp_goal: body.stamp_goal ?? 10,
        biz_type: body.biz_type ?? business?.business_type ?? 'cafe',
        background_color: body.background_color ?? business?.background_color ?? 'rgb(26,24,20)',
        foreground_color: body.foreground_color ?? business?.foreground_color ?? 'rgb(201,169,110)',
        label_color: body.label_color ?? business?.label_color ?? 'rgb(138,128,112)',
        pass_template: body.pass_template ?? business?.pass_template ?? 'classic',
        show_customer_name_on_pass: body.show_customer_name_on_pass ?? business?.show_customer_name_on_pass ?? true,
        plan: 'trial',
        trial_ends_at: trialEnds.toISOString(),
        status: 'active',
      })
      .select('id')
      .single();

    if (cafeError || !cafe) {
      return json({ error: cafeError?.message ?? 'Failed to create cafe' }, 500);
    }

    const { error: chipError } = await supabase
      .from('chips')
      .update({ cafe_id: cafe.id })
      .eq('code', chipCode);

    if (chipError) {
      return json({ error: chipError.message }, 500);
    }

    const token = await signCafeToken(cafe.id, body.email.toLowerCase());

    return json({ success: true, cafeId: cafe.id, token });
  } catch (err) {
    console.error('Activate error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
