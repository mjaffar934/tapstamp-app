import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';
import { HARDWARE_PRICE_GBP, isPaidPlan, parsePlanId, type PlanId } from './plans.ts';

const WEBSITE = Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co';

export function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
}

export function getHardwarePriceId(): string {
  const priceId = Deno.env.get('STRIPE_HARDWARE_PRICE_ID');
  if (!priceId) throw new Error('STRIPE_HARDWARE_PRICE_ID is not configured');
  return priceId;
}

export interface CheckoutParams {
  ownerId: string;
  businessId: string;
  email: string;
  plan: PlanId;
  businessName: string;
}

export async function createHardwareCheckoutSession(
  params: CheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  if (HARDWARE_PRICE_GBP === 0) {
    if (!isPaidPlan(params.plan)) {
      throw new Error('No checkout required for Starter');
    }

    return await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'gbp',
      customer_email: params.email,
      payment_method_types: ['card'],
      metadata: {
        owner_id: params.ownerId,
        business_id: params.businessId,
        plan: params.plan,
        email: params.email,
      },
      success_url: `${WEBSITE}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEBSITE}/order?plan=${params.plan}&canceled=1`,
    });
  }

  const priceId = getHardwarePriceId();
  const saveCard = isPaidPlan(params.plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.email,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_intent_data: saveCard
      ? { setup_future_usage: 'off_session', metadata: { plan: params.plan } }
      : { metadata: { plan: params.plan } },
    metadata: {
      owner_id: params.ownerId,
      business_id: params.businessId,
      plan: params.plan,
      email: params.email,
    },
    success_url: `${WEBSITE}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBSITE}/order?plan=${params.plan}&canceled=1`,
    allow_promotion_codes: true,
  });

  return session;
}

export async function retrieveCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });
}

export function constructStripeEvent(
  payload: string,
  signature: string,
): Stripe.Event {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export function sessionPlan(session: Stripe.Checkout.Session): PlanId {
  return parsePlanId(session.metadata?.plan);
}
