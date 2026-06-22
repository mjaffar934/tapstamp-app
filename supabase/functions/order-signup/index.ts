import {
  fulfillCheckoutSession,
  prepareOrder,
} from '../_shared/createOrder.ts';
import { parsePlanId } from '../_shared/plans.ts';
import {
  orderErrorPage,
  orderFormPage,
  orderPendingPage,
  orderSuccessPage,
} from '../_shared/orderPage.ts';
import { htmlResponse } from '../_shared/utils.ts';

const WEBSITE = 'https://tapstamp.co';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const plan = parsePlanId(url.searchParams.get('plan'));

  if (req.method === 'GET') {
    const sessionId = url.searchParams.get('session_id');
    if (url.searchParams.get('success') === '1' && sessionId) {
      const result = await fulfillCheckoutSession(sessionId);
      if (!result.ok || !result.email) {
        return html(orderErrorPage(
          WEBSITE,
          result.error ?? 'Could not confirm payment. Contact hello@tapstamp.co if you were charged.',
          plan,
        ));
      }
      return html(orderSuccessPage(WEBSITE, result.email, result.plan ?? plan));
    }

    if (url.searchParams.get('canceled') === '1') {
      return html(orderPendingPage(WEBSITE, plan));
    }

    return html(orderFormPage(WEBSITE, plan));
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const contentType = req.headers.get('content-type') ?? '';
    let body: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((value, key) => {
        body[key] = String(value);
      });
    }

    const selectedPlan = parsePlanId(body.plan ?? plan);

    const result = await prepareOrder({
      plan: selectedPlan,
      owner_name: body.owner_name,
      business_name: body.business_name,
      email: body.email,
      password: body.password,
      shipping_address_line1: body.shipping_address_line1,
      city: body.city,
      postcode: body.postcode,
      shipping_phone: body.shipping_phone,
    });

    if (!result.ok) {
      return html(orderErrorPage(
        WEBSITE,
        result.message ?? result.error ?? 'Order failed',
        selectedPlan,
      ));
    }

    if (!result.checkoutUrl) {
      return html(orderErrorPage(WEBSITE, 'Payment could not be started', selectedPlan));
    }

    return Response.redirect(result.checkoutUrl, 303);
  } catch (err) {
    console.error('Order signup error:', err);
    return html(orderErrorPage(WEBSITE, (err as Error).message, plan));
  }
});

function html(body: string): Response {
  return htmlResponse(body);
}
