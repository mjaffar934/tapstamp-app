import { markBusinessPaid } from '../_shared/createOrder.ts';
import { constructStripeEvent } from '../_shared/stripe.ts';
import { syncSubscriptionRecord } from '../_shared/subscription.ts';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';

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
        if (session.payment_status === 'paid' && session.metadata?.business_id) {
          await markBusinessPaid(session.metadata.business_id, session);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionRecord(subscription);
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
