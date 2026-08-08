import {
  createHardwareShopCheckout,
  retrieveHardwareShopSession,
  HARDWARE_PRODUCTS,
  parseHardwareSku,
  resolvePriceId,
} from '../_shared/hardwareShop.ts';
import { corsHeaders, json } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method === 'GET' && url.searchParams.get('diag') === '1') {
    const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    const mode = key.startsWith('sk_live')
      ? 'live'
      : key.startsWith('sk_test')
      ? 'test'
      : key
      ? 'unknown'
      : 'missing';

    const prices: Record<string, {
      envSet: boolean;
      resolved?: string;
      error?: string;
    }> = {};

    for (const product of Object.values(HARDWARE_PRODUCTS)) {
      const envSet = Boolean(Deno.env.get(product.envKey)?.startsWith('price_'));
      if (!key) {
        prices[product.sku] = { envSet, error: 'no stripe key' };
        continue;
      }
      try {
        const resolved = await resolvePriceId(product);
        prices[product.sku] = { envSet, resolved };
      } catch (err) {
        prices[product.sku] = { envSet, error: (err as Error).message };
      }
    }

    return json({
      stripeKey: mode,
      catalog: Object.values(HARDWARE_PRODUCTS).map((p) => ({
        sku: p.sku,
        name: p.name,
        priceGbp: p.priceGbp,
        envKey: p.envKey,
      })),
      prices,
      allResolved: Object.values(prices).every((p) => Boolean(p.resolved)),
      nfcSiteUrl: Deno.env.get('NFC_SITE_URL') ?? null,
    }, 200, req);
  }

  if (req.method === 'GET' && url.searchParams.get('success') === '1') {
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return json({ ok: false, error: 'Missing session' }, 400, req);
    }
    const result = await retrieveHardwareShopSession(sessionId);
    return json(result, result.ok ? 200 : 400, req);
  }

  if (req.method === 'GET' && url.searchParams.get('catalog') === '1') {
    return json({
      products: Object.values(HARDWARE_PRODUCTS).map((p) => ({
        sku: p.sku,
        name: p.name,
        priceGbp: p.priceGbp,
        compareAtGbp: Math.round(p.priceGbp / 0.7),
        linkLabel: p.linkLabel,
        linkHint: p.linkHint,
      })),
    }, 200, req);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, req);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, req);
  }

  const itemsRaw = Array.isArray(body.items) ? body.items : null;
  const hasItems = Boolean(itemsRaw && itemsRaw.length);
  if (!hasItems && !parseHardwareSku(body.sku)) {
    return json({ error: 'Unknown product' }, 400, req);
  }

  const result = await createHardwareShopCheckout({
    sku: typeof body.sku === 'string' ? body.sku : undefined,
    items: hasItems
      ? itemsRaw!.map((row) => ({
        sku: typeof (row as { sku?: unknown }).sku === 'string'
          ? (row as { sku: string }).sku
          : undefined,
        quantity: typeof (row as { quantity?: unknown }).quantity === 'number'
          ? (row as { quantity: number }).quantity
          : undefined,
      }))
      : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    business_name: typeof body.business_name === 'string' ? body.business_name : undefined,
    contact_name: typeof body.contact_name === 'string' ? body.contact_name : undefined,
    program_url: typeof body.program_url === 'string' ? body.program_url : undefined,
    google_url: typeof body.google_url === 'string' ? body.google_url : undefined,
    google_business_lookup: body.google_business_lookup === true,
    instagram_handle: typeof body.instagram_handle === 'string' ? body.instagram_handle : undefined,
    shipping_address_line1: typeof body.shipping_address_line1 === 'string'
      ? body.shipping_address_line1
      : undefined,
    city: typeof body.city === 'string' ? body.city : undefined,
    postcode: typeof body.postcode === 'string' ? body.postcode : undefined,
    shipping_phone: typeof body.shipping_phone === 'string' ? body.shipping_phone : undefined,
    delivery_method: typeof body.delivery_method === 'string' ? body.delivery_method : undefined,
    quantity: typeof body.quantity === 'number' ? body.quantity : undefined,
    site: typeof body.site === 'string' ? body.site : 'nfc',
    success_base: typeof body.success_base === 'string' ? body.success_base : undefined,
    cancel_base: typeof body.cancel_base === 'string' ? body.cancel_base : undefined,
    start_loyalty: body.start_loyalty === true,
  });

  if (!result.ok) {
    return json({ error: result.error ?? 'Checkout failed' }, result.status, req);
  }

  return json({
    checkoutUrl: result.checkoutUrl,
    sessionId: result.sessionId,
    sku: result.sku,
    productName: result.productName,
    priceGbp: result.priceGbp,
    totalGbp: result.totalGbp,
    itemCount: result.itemCount,
  }, 200, req);
});
