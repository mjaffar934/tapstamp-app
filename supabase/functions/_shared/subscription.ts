import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { supabase } from './client.ts';
import { isPaidPlan, isStarterPlan, parsePlanId, TRIAL_DAYS, type PlanId } from './plans.ts';

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export function getSubscriptionPriceId(plan: PlanId): string {
  if (plan === 'pro') {
    const id = Deno.env.get('STRIPE_PRO_PRICE_ID');
    if (!id) throw new Error('STRIPE_PRO_PRICE_ID is not configured');
    return id;
  }
  if (plan === 'multi') {
    const id = Deno.env.get('STRIPE_MULTI_PRICE_ID');
    if (!id) throw new Error('STRIPE_MULTI_PRICE_ID is not configured');
    return id;
  }
  throw new Error('Starter plan has no subscription price');
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

export async function createGoLiveSubscription(params: {
  customerId: string;
  plan: PlanId;
  businessId: string;
  cafeId: string;
  ownerId: string;
}): Promise<Stripe.Subscription> {
  const stripe = getStripeFromSubscription();
  const priceId = getSubscriptionPriceId(params.plan);

  return await stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: priceId }],
    trial_period_days: TRIAL_DAYS,
    metadata: {
      business_id: params.businessId,
      cafe_id: params.cafeId,
      owner_id: params.ownerId,
      plan: params.plan,
    },
  });
}

function getStripeFromSubscription(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
}

export async function syncSubscriptionRecord(
  subscription: Stripe.Subscription,
): Promise<void> {
  const businessId = subscription.metadata?.business_id;
  const cafeId = subscription.metadata?.cafe_id;
  const plan = parsePlanId(subscription.metadata?.plan);
  const status = mapStripeSubscriptionStatus(subscription.status);

  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const cafeStatus = resolveCafeStatus(plan, status, trialEndsAt);

  if (businessId) {
    await supabase.from('businesses').update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      plan_selected: plan,
    }).eq('id', businessId);
  }

  if (cafeId) {
    await supabase.from('cafes').update({
      plan,
      subscription_status: status,
      trial_ends_at: trialEndsAt,
      status: cafeStatus,
    }).eq('id', cafeId);
  }
}

function resolveCafeStatus(
  plan: PlanId,
  status: SubscriptionStatus,
  trialEndsAt: string | null,
): 'active' | 'suspended' {
  if (isStarterPlan(plan)) return 'active';

  if (status === 'trialing') return 'active';
  if (status === 'active') return 'active';

  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 'active';

  return 'suspended';
}

export async function activateStarterFreeTier(
  businessId: string,
  cafeId: string,
): Promise<void> {
  await supabase.from('businesses').update({
    subscription_status: 'active',
  }).eq('id', businessId);

  await supabase.from('cafes').update({
    subscription_status: 'active',
    status: 'active',
  }).eq('id', cafeId);
}

/** Starter: after trial ends, move to free tier without Stripe. */
export async function normalizeCafeBillingState(cafe: {
  id: string;
  plan?: string;
  trial_ends_at?: string | null;
  subscription_status?: string;
  email?: string;
}): Promise<void> {
  if (!isStarterPlan(cafe.plan)) return;
  if (!cafe.trial_ends_at || new Date(cafe.trial_ends_at) > new Date()) return;
  if (cafe.subscription_status === 'active') return;

  let businessId: string | null = null;

  if (cafe.email) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .ilike('email', cafe.email)
      .maybeSingle();
    businessId = business?.id ?? null;
  }

  if (businessId) {
    await activateStarterFreeTier(businessId, cafe.id);
    return;
  }

  await supabase.from('cafes').update({
    subscription_status: 'active',
    status: 'active',
  }).eq('id', cafe.id);
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripeFromSubscription();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) throw new Error('Failed to create billing portal session');
  return session.url;
}
