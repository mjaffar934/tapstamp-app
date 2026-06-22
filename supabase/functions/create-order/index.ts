import { prepareOrder } from '../_shared/createOrder.ts';
import { json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const result = await prepareOrder(body);

    if (!result.ok) {
      return json({ error: result.error, message: result.message }, result.status);
    }

    return json({
      success: true,
      userId: result.userId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
