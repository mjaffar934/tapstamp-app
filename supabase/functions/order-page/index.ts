import { parsePlanId } from '../_shared/plans.ts';
import {
  orderErrorPage,
  orderFormPage,
  orderPendingPage,
  orderSuccessPage,
} from '../_shared/orderPage.ts';

const WEBSITE = 'https://tapstamp.co';
const CHECKOUT_URL = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '') +
  '/functions/v1/order-checkout';

function html(body: string): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const plan = parsePlanId(url.searchParams.get('plan'));

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sessionId = url.searchParams.get('session_id');
  if (url.searchParams.get('success') === '1' && sessionId) {
    const fulfillUrl = `${CHECKOUT_URL}?success=1&session_id=${encodeURIComponent(sessionId)}`;
    const res = await fetch(fulfillUrl);
    const data = await res.json() as { ok?: boolean; email?: string; plan?: string; error?: string };
    if (!data.ok || !data.email) {
      return html(orderErrorPage(WEBSITE, data.error ?? 'Could not confirm payment', plan));
    }
    return html(orderSuccessPage(WEBSITE, data.email, parsePlanId(data.plan ?? plan)));
  }

  if (url.searchParams.get('canceled') === '1') {
    return html(orderPendingPage(WEBSITE, plan));
  }

  return html(orderFormPage(WEBSITE, plan, CHECKOUT_URL));
});
