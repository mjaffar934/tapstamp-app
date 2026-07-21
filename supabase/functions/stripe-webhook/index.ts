import { markBusinessPaid } from '../_shared/createOrder.ts';
import { constructStripeEvent } from '../_shared/stripe.ts';
import { syncSubscriptionRecord } from '../_shared/subscription.ts';
import { notifyOwnerCardDeclined } from '../_shared/ownerPush.ts';
import { supabase } from '../_shared/client.ts';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';

async function findBusinessByCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;
  const { data } = await supabase
    .from('businesses')
    .select('id, name, expo_push_token, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data;
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id ?? null;

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, owner_id, expo_push_token')
    .eq('stripe_customer_id', customerId ?? '')
    .maybeSingle();

  if (!business) {
    console.warn('Payment failed: no business for customer', customerId);
    return;
  }

  await supabase.from('businesses').update({
    subscription_status: 'past_due',
  }).eq('id', business.id);

  if (business.owner_id) {
    await supabase.from('cafes').update({
      subscription_status: 'past_due',
    }).eq('owner_id', business.owner_id);
  }

  await notifyOwnerCardDeclined({
    expoPushToken: business.expo_push_token,
    businessName: business.name,
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  try {
    const payload = await req.text();
    const event = constructStripeEvent(payload, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.business_id;
        if (!businessId) break;

        if (
          session.mode === 'setup'
          || session.payment_status === 'paid'
          || session.payment_status === 'no_payment_required'
        ) {
          await markBusinessPaid(businessId, session);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionRecord(subscription);

        // Card successfully charged / subscription healthy → mark billing ready.
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const businessId = subscription.metadata?.business_id;
          if (businessId) {
            await supabase.from('businesses').update({
              billing_card_added_at: new Date().toISOString(),
            }).eq('id', businessId).is('billing_card_added_at', null);
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 });
  }
});
