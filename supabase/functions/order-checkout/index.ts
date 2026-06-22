import { fulfillCheckoutSession, prepareOrder } from '../_shared/createOrder.ts';
import { parsePlanId } from '../_shared/plans.ts';
import { corsHeaders, json } from '../_shared/utils.ts';

const WEBSITE = Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method === 'GET' && url.searchParams.get('success') === '1') {
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return json({ ok: false, error: 'Missing session' }, 400, req);
    }
    const result = await fulfillCheckoutSession(sessionId);
    return json({
      ok: result.ok,
      email: result.email,
      plan: result.plan,
      error: result.error,
    }, result.ok ? 200 : 400, req);
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

    const plan = parsePlanId(body.plan);

    const result = await prepareOrder({
      plan,
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
      const message = result.message ?? result.error ?? 'Order failed';
      if (contentType.includes('application/json')) {
        return json({ ok: false, error: result.error, message }, result.status, req);
      }
      return redirectToOrder(plan, message);
    }

    if (!result.checkoutUrl) {
      if (contentType.includes('application/json')) {
        return json({ ok: false, error: 'Payment could not be started' }, 500, req);
      }
      return redirectToOrder(plan, 'Payment could not be started');
    }

    if (contentType.includes('application/json')) {
      return json({ ok: true, checkoutUrl: result.checkoutUrl }, 200, req);
    }

    return Response.redirect(result.checkoutUrl, 303);
  } catch (err) {
    console.error('Order checkout error:', err);
    const plan = planFromReq(req);
    const message = (err as Error).message;
    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return json({ ok: false, error: message }, 500, req);
    }
    return redirectToOrder(plan, message);
  }
});

function redirectToOrder(plan: ReturnType<typeof parsePlanId>, message: string): Response {
  const error = encodeURIComponent(message);
  return Response.redirect(`${WEBSITE}/order?plan=${plan}&error=${error}`, 303);
}

function planFromReq(req: Request): ReturnType<typeof parsePlanId> {
  try {
    return parsePlanId(new URL(req.url).searchParams.get('plan'));
  } catch {
    return 'starter';
  }
}
