import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { SUPABASE_URL, supabase } from './client.ts';
import {
  createGoLiveSubscription,
} from './subscription.ts';
import { isPaidPlan, parsePlanId, TRIAL_DAYS, type PlanId } from './plans.ts';
import {
  createHardwareCheckoutSession,
  retrieveCheckoutSession,
} from './stripe.ts';
import { generateStaffCode } from './staffCode.ts';

export interface OrderBody {
  plan?: string;
  owner_name?: string;
  business_name?: string;
  email?: string;
  password?: string;
  shipping_address_line1?: string;
  city?: string;
  postcode?: string;
  shipping_phone?: string;
}

export interface OrderResult {
  ok: boolean;
  status: number;
  error?: string;
  message?: string;
  userId?: string;
  businessId?: string;
  plan?: PlanId;
  checkoutUrl?: string;
  accountReady?: boolean;
  email?: string;
}

export async function prepareOrder(body: OrderBody): Promise<OrderResult> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    return { ok: false, status: 500, error: 'Server misconfigured' };
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const businessName = body.business_name?.trim() || 'My Cafe';
  const ownerName = body.owner_name?.trim() || '';
  const plan = parsePlanId(body.plan);

  if (!email || !password) {
    return { ok: false, status: 400, error: 'Email and password are required' };
  }
  if (password.length < 8) {
    return { ok: false, status: 400, error: 'Password must be at least 8 characters' };
  }
  if (!body.shipping_address_line1?.trim()) {
    return { ok: false, status: 400, error: 'Shipping address is required' };
  }
  if (!body.postcode?.trim()) {
    return { ok: false, status: 400, error: 'Postcode is required' };
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingBizByEmail } = await supabase
    .from('businesses')
    .select('id, owner_id, order_status, plan_selected, email')
    .eq('email', email)
    .maybeSingle();

  if (existingBizByEmail) {
    if (existingBizByEmail.order_status === 'pending_payment') {
      if (!isPaidPlan(parsePlanId(existingBizByEmail.plan_selected ?? plan))) {
        await markBusinessPaidFree(existingBizByEmail.id);
        return {
          ok: true,
          status: 200,
          userId: existingBizByEmail.owner_id,
          businessId: existingBizByEmail.id,
          plan: parsePlanId(existingBizByEmail.plan_selected ?? plan),
          accountReady: true,
          email,
        };
      }

      try {
        const session = await createHardwareCheckoutSession({
          ownerId: existingBizByEmail.owner_id,
          businessId: existingBizByEmail.id,
          email,
          plan: parsePlanId(existingBizByEmail.plan_selected ?? plan),
          businessName,
        });

        await supabase.from('businesses').update({
          stripe_checkout_session_id: session.id,
        }).eq('id', existingBizByEmail.id);

        if (!session.url) {
          return { ok: false, status: 500, error: 'Failed to create checkout session' };
        }

        return {
          ok: true,
          status: 200,
          userId: existingBizByEmail.owner_id,
          businessId: existingBizByEmail.id,
          plan: parsePlanId(existingBizByEmail.plan_selected ?? plan),
          checkoutUrl: session.url,
        };
      } catch (err) {
        return { ok: false, status: 500, error: (err as Error).message };
      }
    }

    return {
      ok: false,
      status: 409,
      error: 'account_exists',
      message: 'An account with this email already exists. Sign in to the TapStamp owner app instead.',
    };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  const userId = created.user?.id;

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return {
        ok: false,
        status: 409,
        error: 'account_exists',
        message: 'An account with this email already exists. Sign in to the TapStamp owner app instead.',
      };
    }
    if (msg.includes('rate limit')) {
      return {
        ok: false,
        status: 429,
        error: 'rate_limit',
        message: 'Too many sign-up attempts. Wait a few minutes, or sign in if you already ordered.',
      };
    }
    return { ok: false, status: 400, error: createError.message };
  }

  if (!userId) {
    return { ok: false, status: 500, error: 'Failed to create account' };
  }

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      name: businessName,
      email,
      owner_name: ownerName || null,
      city: body.city?.trim() || null,
      postcode: body.postcode?.trim() || null,
      shipping_address_line1: body.shipping_address_line1.trim(),
      shipping_phone: body.shipping_phone?.trim() || null,
      plan_selected: plan,
      order_status: 'pending_payment',
      kit_received: false,
      onboarding_status: 'ordered',
      subscription_status: 'none',
    })
    .select('id')
    .single();

  if (bizError || !business) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, status: 500, error: bizError?.message ?? 'Failed to create order' };
  }

  const businessId = business.id as string;

  const { data: existingCafe } = await supabase
    .from('cafes')
    .select('id, staff_code')
    .eq('email', email)
    .maybeSingle();

  if (!existingCafe) {
    const passwordHash = await placeholderPasswordHash();

    await supabase.from('cafes').insert({
      name: businessName,
      email,
      password_hash: passwordHash,
      biz_type: 'cafe',
      plan,
      trial_ends_at: null,
      status: 'active',
      city: body.city?.trim() || null,
      postcode: body.postcode?.trim() || null,
      staff_code: generateStaffCode(),
      subscription_status: 'none',
    });
  } else {
    await supabase.from('cafes').update({
      plan,
      trial_ends_at: null,
      subscription_status: 'none',
      ...(existingCafe.staff_code ? {} : { staff_code: generateStaffCode() }),
    }).eq('id', existingCafe.id);
  }

  try {
    if (!isPaidPlan(plan)) {
      await markBusinessPaidFree(businessId);
      return {
        ok: true,
        status: 200,
        userId,
        businessId,
        plan,
        accountReady: true,
        email,
      };
    }

    const session = await createHardwareCheckoutSession({
      ownerId: userId,
      businessId,
      email,
      plan,
      businessName,
    });

    await supabase.from('businesses').update({
      stripe_checkout_session_id: session.id,
    }).eq('id', businessId);

    if (!session.url) {
      return { ok: false, status: 500, error: 'Failed to create checkout session' };
    }

    return {
      ok: true,
      status: 200,
      userId,
      businessId,
      plan,
      checkoutUrl: session.url,
    };
  } catch (err) {
    await supabase.from('businesses').delete().eq('id', businessId);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, status: 500, error: (err as Error).message };
  }
}

/** @deprecated Use prepareOrder — kept for compatibility */
export async function processOrder(body: OrderBody): Promise<OrderResult> {
  return prepareOrder(body);
}

export async function fulfillCheckoutSession(
  sessionId: string,
): Promise<{ ok: boolean; email?: string; plan?: PlanId; error?: string }> {
  try {
    const session = await retrieveCheckoutSession(sessionId);

    const isSetup = session.mode === 'setup';
    if (!isSetup && session.payment_status !== 'paid') {
      return { ok: false, error: 'Payment not completed' };
    }
    if (isSetup && session.status !== 'complete') {
      return { ok: false, error: 'Card setup not completed' };
    }

    const businessId = session.metadata?.business_id;
    if (!businessId) {
      return { ok: false, error: 'Missing order metadata' };
    }

    await markBusinessPaid(businessId, session);
    const plan = parsePlanId(session.metadata?.plan);

    return {
      ok: true,
      email: session.metadata?.email ?? session.customer_email ?? undefined,
      plan,
    };
  } catch (err) {
    console.error('Fulfill checkout error:', err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function markBusinessPaid(
  businessId: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { data: existing } = await supabase
    .from('businesses')
    .select('order_status')
    .eq('id', businessId)
    .maybeSingle();

  if (existing?.order_status === 'paid') return;

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null;

  await supabase.from('businesses').update({
    order_status: 'paid',
    stripe_customer_id: customerId,
    stripe_checkout_session_id: session.id,
  }).eq('id', businessId);
}

export async function markBusinessPaidFree(businessId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('businesses')
    .select('order_status')
    .eq('id', businessId)
    .maybeSingle();

  if (existing?.order_status === 'paid') return;

  await supabase.from('businesses').update({
    order_status: 'paid',
  }).eq('id', businessId);
}

export async function resumeCheckoutForOwner(
  ownerId: string,
): Promise<{ ok: boolean; checkoutUrl?: string; error?: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, email, name, plan_selected, order_status')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!business) {
    return { ok: false, error: 'No order found for this account' };
  }

  if (business.order_status !== 'pending_payment') {
    return { ok: false, error: 'Order payment already completed' };
  }

  if (!isPaidPlan(business.plan_selected)) {
    await markBusinessPaidFree(business.id);
    return { ok: false, error: 'No payment required for Starter' };
  }

  if (!business.email) {
    return { ok: false, error: 'Order email missing' };
  }

  try {
    const session = await createHardwareCheckoutSession({
      ownerId,
      businessId: business.id,
      email: business.email,
      plan: parsePlanId(business.plan_selected),
      businessName: business.name,
    });

    await supabase.from('businesses').update({
      stripe_checkout_session_id: session.id,
    }).eq('id', business.id);

    if (!session.url) {
      return { ok: false, error: 'Failed to create checkout session' };
    }

    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function ensureCafeStaffCode(cafeId: string): Promise<string | null> {
  const { data: cafe } = await supabase
    .from('cafes')
    .select('staff_code')
    .eq('id', cafeId)
    .maybeSingle();

  if (cafe?.staff_code) return cafe.staff_code;

  const code = generateStaffCode();
  await supabase.from('cafes').update({ staff_code: code }).eq('id', cafeId);
  return code;
}

export async function startGoLiveTrial(ownerId: string, cafeId: string): Promise<void> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, plan_selected, stripe_customer_id, stripe_subscription_id, order_status')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!business) return;

  const { data: cafe } = await supabase
    .from('cafes')
    .select('trial_ends_at, plan')
    .eq('id', cafeId)
    .maybeSingle();

  if (cafe?.trial_ends_at) return;

  const plan = parsePlanId(business.plan_selected ?? cafe?.plan);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
  const trialEndsIso = trialEnds.toISOString();

  if (isPaidPlan(plan) && business.stripe_customer_id && !business.stripe_subscription_id) {
    try {
      const subscription = await createGoLiveSubscription({
        customerId: business.stripe_customer_id,
        plan,
        businessId: business.id,
        cafeId,
        ownerId,
      });

      const stripeTrialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : trialEndsIso;

      await supabase.from('businesses').update({
        stripe_subscription_id: subscription.id,
        subscription_status: 'trialing',
        plan_selected: plan,
      }).eq('id', business.id);

      await supabase.from('cafes').update({
        plan,
        trial_ends_at: stripeTrialEnd,
        subscription_status: 'trialing',
        status: 'active',
      }).eq('id', cafeId);

      return;
    } catch (err) {
      console.error('Stripe subscription at go-live failed, falling back to DB trial:', err);
    }
  }

  await supabase.from('cafes').update({
    plan,
    trial_ends_at: trialEndsIso,
    subscription_status: 'trialing',
    status: 'active',
  }).eq('id', cafeId);

  await supabase.from('businesses').update({
    subscription_status: 'trialing',
    plan_selected: plan,
  }).eq('owner_id', ownerId);
}

/** Legacy cafes.password_hash column — owners use Supabase Auth, not this field. */
async function placeholderPasswordHash(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
