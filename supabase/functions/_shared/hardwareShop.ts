/** One-time NFC hardware SKUs sold on the NFC shop */

export type HardwareSku =
  | 'google_stand'
  | 'instagram_stand'
  | 'google_epoxy'
  | 'instagram_epoxy';

export interface HardwareProduct {
  sku: HardwareSku;
  name: string;
  /** Unit list price in GBP (pence-friendly decimals) */
  priceGbp: number;
  envKey: string;
  linkLabel: string;
  linkHint: string;
  nameMatchers: RegExp[];
  kind: 'stand' | 'epoxy';
  family: 'google' | 'instagram';
}

export const HARDWARE_PRODUCTS: Record<HardwareSku, HardwareProduct> = {
  google_stand: {
    sku: 'google_stand',
    name: 'Google Reviews NFC stand',
    priceGbp: 18.99,
    envKey: 'STRIPE_PRICE_GOOGLE_STAND',
    linkLabel: 'Google review URL',
    linkHint: 'Paste the Google review / Maps link — or leave blank and we’ll find it from your business details',
    nameMatchers: [/google.*review.*stand/i, /google reviews? (nfc )?stand/i],
    kind: 'stand',
    family: 'google',
  },
  instagram_stand: {
    sku: 'instagram_stand',
    name: 'Instagram NFC stand',
    priceGbp: 18.99,
    envKey: 'STRIPE_PRICE_INSTAGRAM_STAND',
    linkLabel: 'Instagram URL',
    linkHint: 'Paste the Instagram profile or @handle',
    nameMatchers: [/instagram.*(nfc )?stand/i],
    kind: 'stand',
    family: 'instagram',
  },
  google_epoxy: {
    sku: 'google_epoxy',
    name: 'Google Reviews NFC',
    priceGbp: 14.99,
    envKey: 'STRIPE_PRICE_GOOGLE_EPOXY',
    linkLabel: 'Google review URL',
    linkHint: 'Paste the Google review / Maps link — or leave blank and we’ll find it from your business details',
    nameMatchers: [/google.*(epoxy|sticker|nfc)/i, /epoxy.*google/i],
    kind: 'epoxy',
    family: 'google',
  },
  instagram_epoxy: {
    sku: 'instagram_epoxy',
    name: 'Instagram NFC',
    priceGbp: 14.99,
    envKey: 'STRIPE_PRICE_INSTAGRAM_EPOXY',
    linkLabel: 'Instagram URL',
    linkHint: 'Paste the Instagram profile or @handle',
    nameMatchers: [/instagram.*(epoxy|sticker|nfc)/i, /epoxy.*instagram/i],
    kind: 'epoxy',
    family: 'instagram',
  },
};

/** Deal totals in pence */
export const HARDWARE_DEALS = {
  stand_pair_pence: 3499, // Google + Instagram stand
  epoxy_pair_pence: 2499, // any two epoxy
  mixed_pence: 3299, // any stand + any epoxy
} as const;

export function parseHardwareSku(raw: unknown): HardwareSku | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase() as HardwareSku;
  return key in HARDWARE_PRODUCTS ? key : null;
}

export function gbpToPence(gbp: number): number {
  return Math.round(gbp * 100);
}

export function penceToGbp(pence: number): number {
  return Math.round(pence) / 100;
}

/**
 * Expand cart into priced units, applying deals (best for customer):
 * 1) Google stand + Instagram stand → £34.99
 * 2) Any 2 epoxy → £24.99
 * 3) Any stand + any epoxy → £32.99
 * Remainder at unit prices.
 */
export function priceHardwareCart(
  items: Array<{ sku: HardwareSku; quantity: number }>,
): {
  listPence: number;
  dealPence: number;
  discountPence: number;
  nextDay: boolean;
  labels: string[];
} {
  const stands: HardwareSku[] = [];
  const epoxies: HardwareSku[] = [];
  let listPence = 0;

  for (const item of items) {
    const product = HARDWARE_PRODUCTS[item.sku];
    const qty = Math.min(20, Math.max(1, item.quantity));
    listPence += gbpToPence(product.priceGbp) * qty;
    for (let i = 0; i < qty; i++) {
      if (product.kind === 'stand') stands.push(item.sku);
      else epoxies.push(item.sku);
    }
  }

  let dealPence = 0;
  const labels: string[] = [];

  const take = (arr: HardwareSku[], sku: HardwareSku): boolean => {
    const idx = arr.indexOf(sku);
    if (idx < 0) return false;
    arr.splice(idx, 1);
    return true;
  };

  while (stands.includes('google_stand') && stands.includes('instagram_stand')) {
    take(stands, 'google_stand');
    take(stands, 'instagram_stand');
    dealPence += HARDWARE_DEALS.stand_pair_pence;
    labels.push('stand_pair');
  }

  while (epoxies.length >= 2) {
    epoxies.pop();
    epoxies.pop();
    dealPence += HARDWARE_DEALS.epoxy_pair_pence;
    labels.push('epoxy_pair');
  }

  while (stands.length >= 1 && epoxies.length >= 1) {
    stands.pop();
    epoxies.pop();
    dealPence += HARDWARE_DEALS.mixed_pence;
    labels.push('mixed');
  }

  for (const sku of stands) {
    dealPence += gbpToPence(HARDWARE_PRODUCTS[sku].priceGbp);
  }
  for (const sku of epoxies) {
    dealPence += gbpToPence(HARDWARE_PRODUCTS[sku].priceGbp);
  }

  const totalUnits = items.reduce((n, i) => n + Math.min(20, Math.max(1, i.quantity)), 0);

  return {
    listPence,
    dealPence,
    discountPence: Math.max(0, listPence - dealPence),
    nextDay: totalUnits >= 2,
    labels,
  };
}

function stripeAuthHeaders(): HeadersInit {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return { Authorization: `Bearer ${key}` };
}

async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: stripeAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: { message?: string } })?.error?.message ?? `Stripe GET ${res.status}`,
    );
  }
  return data as Record<string, unknown>;
}

async function stripePost(
  path: string,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      ...stripeAuthHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: { message?: string } })?.error?.message ?? `Stripe POST ${res.status}`,
    );
  }
  return data as Record<string, unknown>;
}

async function listActiveProducts(): Promise<Array<{
  id: string;
  name?: string;
  metadata?: Record<string, string>;
  default_price?: string | { id?: string } | null;
}>> {
  const out: Array<{
    id: string;
    name?: string;
    metadata?: Record<string, string>;
    default_price?: string | { id?: string } | null;
  }> = [];
  let startingAfter: string | undefined;
  for (;;) {
    const q = new URLSearchParams({ limit: '100', active: 'true' });
    if (startingAfter) q.set('starting_after', startingAfter);
    const page = await stripeGet(`/products?${q}`);
    const data = (page.data as typeof out) ?? [];
    out.push(...data);
    if (!page.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1]?.id;
  }
  return out;
}

export async function resolvePriceId(product: HardwareProduct): Promise<string> {
  const fromEnv = Deno.env.get(product.envKey)?.trim();
  // Env price may be stale after a price change — still prefer exact amount match below
  const products = await listActiveProducts();
  const match = products.find((p) => {
    if (p.metadata?.tapstamp_sku === product.sku) return true;
    const name = p.name ?? '';
    return product.nameMatchers.some((re) => re.test(name));
  });

  if (!match && fromEnv?.startsWith('price_')) {
    return fromEnv;
  }
  if (!match) {
    // Create product + price so catalog stays in sync
    const created = await stripePost(
      '/products',
      new URLSearchParams({
        name: product.name,
        'metadata[tapstamp_sku]': product.sku,
      }),
    );
    const productId = String(created.id);
    const price = await stripePost(
      '/prices',
      new URLSearchParams({
        product: productId,
        currency: 'gbp',
        unit_amount: String(gbpToPence(product.priceGbp)),
        'metadata[tapstamp_sku]': product.sku,
      }),
    );
    await stripePost(
      `/products/${productId}`,
      new URLSearchParams({ default_price: String(price.id) }),
    );
    return String(price.id);
  }

  const prices = await stripeGet(
    `/prices?product=${match.id}&active=true&limit=20`,
  );
  const list = (prices.data as Array<{
    id: string;
    unit_amount?: number | null;
    currency?: string;
    type?: string;
  }>) ?? [];
  const expected = gbpToPence(product.priceGbp);
  const exact = list.find(
    (p) => p.currency === 'gbp' && p.unit_amount === expected && p.type === 'one_time',
  );
  if (exact) return exact.id;

  // Create the new unit price and make it default (old prices stay for history)
  const price = await stripePost(
    '/prices',
    new URLSearchParams({
      product: match.id,
      currency: 'gbp',
      unit_amount: String(expected),
      'metadata[tapstamp_sku]': product.sku,
    }),
  );
  await stripePost(
    `/products/${match.id}`,
    new URLSearchParams({
      name: product.name,
      default_price: String(price.id),
      'metadata[tapstamp_sku]': product.sku,
    }),
  );
  return String(price.id);
}

export function normalizeProgramUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Accepts @handle, handle, or full Instagram URL. */
export function normalizeInstagramUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const handleMatch = trimmed.match(/^@?([A-Za-z0-9._]{1,30})$/);
  if (handleMatch) {
    return `https://instagram.com/${handleMatch[1]}`;
  }
  return normalizeProgramUrl(trimmed);
}

export interface HardwareCartItem {
  sku: HardwareSku;
  quantity: number;
}

export interface HardwareCheckoutBody {
  sku?: string;
  items?: Array<{ sku?: string; quantity?: number }>;
  email?: string;
  business_name?: string;
  contact_name?: string;
  program_url?: string;
  google_url?: string;
  /** When no Google URL — we look up the review link from name + address */
  google_business_lookup?: boolean;
  instagram_handle?: string;
  shipping_address_line1?: string;
  city?: string;
  postcode?: string;
  shipping_phone?: string;
  /** london_dropoff | uk_post */
  delivery_method?: string;
  quantity?: number;
  site?: string;
  success_base?: string;
  cancel_base?: string;
  /**
   * When true: after hardware payment, success page redirects to loyalty /order.
   * Metadata only — never adds a Stripe line item or changes hardware price.
   */
  start_loyalty?: boolean;
}

export interface HardwareCheckoutResult {
  ok: boolean;
  status: number;
  error?: string;
  checkoutUrl?: string;
  sessionId?: string;
  sku?: HardwareSku;
  productName?: string;
  priceGbp?: number;
  totalGbp?: number;
  itemCount?: number;
}

function parseCartItems(body: HardwareCheckoutBody): HardwareCartItem[] | null {
  const out: HardwareCartItem[] = [];
  if (Array.isArray(body.items) && body.items.length > 0) {
    for (const row of body.items) {
      const sku = parseHardwareSku(row?.sku);
      if (!sku) return null;
      const quantity = Math.min(20, Math.max(1, Number(row?.quantity) || 1));
      const existing = out.find((i) => i.sku === sku);
      if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
      else out.push({ sku, quantity });
    }
    return out.length ? out : null;
  }
  const sku = parseHardwareSku(body.sku);
  if (!sku) return null;
  return [{ sku, quantity: Math.min(20, Math.max(1, Number(body.quantity) || 1)) }];
}

function resolveReturnBases(body: HardwareCheckoutBody): { successBase: string; cancelBase: string } {
  const loyalty = (Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co').replace(/\/$/, '');
  const nfcHost = (Deno.env.get('NFC_SITE_URL') ?? '').replace(/\/$/, '');
  const isNfc = body.site === 'nfc' || Boolean(body.success_base);

  if (typeof body.success_base === 'string' && body.success_base.startsWith('http')) {
    const successBase = body.success_base.replace(/\/$/, '');
    const cancelBase = (typeof body.cancel_base === 'string' && body.cancel_base.startsWith('http')
      ? body.cancel_base
      : successBase.replace(/\/checkout\/success$/, '/checkout').replace(/\/success$/, '')
    ).replace(/\/$/, '');
    return { successBase, cancelBase };
  }

  if (isNfc) {
    const root = nfcHost || `${loyalty}/reviews`;
    return {
      successBase: `${root}/checkout/success`,
      cancelBase: `${root}/checkout`,
    };
  }

  return {
    successBase: `${loyalty}/reviews/checkout/success`,
    cancelBase: `${loyalty}/reviews/checkout`,
  };
}

export async function createHardwareShopCheckout(
  body: HardwareCheckoutBody,
): Promise<HardwareCheckoutResult> {
  const items = parseCartItems(body);
  if (!items) {
    return { ok: false, status: 400, error: 'Choose a product' };
  }

  // Email/shipping are collected on Stripe Checkout; optional if provided here
  const email = body.email?.trim().toLowerCase() || '';
  const needsGoogle = items.some((i) => i.sku.startsWith('google_'));
  const needsInstagram = items.some((i) => i.sku.startsWith('instagram_'));

  let googleUrl: string | null = null;
  let instagramUrl: string | null = null;
  let googleLookup = false;

  const businessName = body.business_name?.trim() || '';
  const contactName = body.contact_name?.trim() || '';
  const address = body.shipping_address_line1?.trim() || '';
  const city = body.city?.trim() || '';
  const postcode = body.postcode?.trim() || '';

  if (needsGoogle) {
    googleUrl = normalizeProgramUrl(body.google_url ?? body.program_url ?? '');
    if (!googleUrl) {
      // Fallback: find Google review link from business name + address
      if (businessName && address) {
        googleLookup = true;
      } else {
        return {
          ok: false,
          status: 400,
          error: 'Add a Google review / Maps URL, or your business name and address so we can find it',
        };
      }
    }
  }
  if (needsInstagram) {
    instagramUrl = normalizeInstagramUrl(body.instagram_handle ?? body.program_url ?? '');
    if (!instagramUrl) {
      return { ok: false, status: 400, error: 'A valid Instagram @handle or profile URL is required' };
    }
  }

  const delivery = (body.delivery_method || 'uk_post').trim().toLowerCase();
  const londonDropoff = delivery === 'london_dropoff';
  const startLoyalty = body.start_loyalty === true;

  const priced = priceHardwareCart(items);
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const primaryProgramUrl = googleUrl || instagramUrl ||
    (googleLookup ? `lookup:${businessName}, ${address}, ${city} ${postcode}`.trim() : '');

  const priceIds: Array<{ priceId: string; quantity: number; sku: HardwareSku }> = [];
  try {
    for (const item of items) {
      const product = HARDWARE_PRODUCTS[item.sku];
      const priceId = await resolvePriceId(product);
      priceIds.push({ priceId, quantity: item.quantity, sku: item.sku });
    }
  } catch (err) {
    return { ok: false, status: 500, error: (err as Error).message };
  }

  let couponId: string | undefined;
  if (priced.discountPence > 0) {
    try {
      const coupon = await stripePost('/coupons', new URLSearchParams({
        amount_off: String(priced.discountPence),
        currency: 'gbp',
        duration: 'once',
        name: `NFC deal £${penceToGbp(priced.discountPence).toFixed(2)} off`,
        'metadata[purpose]': 'hardware_deal',
        'metadata[deals]': priced.labels.join(','),
      }));
      if (typeof coupon.id === 'string') couponId = coupon.id;
    } catch (err) {
      return { ok: false, status: 500, error: (err as Error).message };
    }
  }

  const { successBase, cancelBase } = resolveReturnBases(body);
  const successQs = new URLSearchParams({
    session_id: '{CHECKOUT_SESSION_ID}',
    flow: 'hardware',
  });

  const form = new URLSearchParams({
    mode: 'payment',
    success_url: `${successBase}?${successQs.toString()}`,
    cancel_url: `${cancelBase}?canceled=1`,
    // Apple Pay / Google Pay / Link via Stripe Checkout
    'payment_method_types[0]': 'card',
    'payment_method_types[1]': 'link',
    'phone_number_collection[enabled]': 'true',
    'shipping_address_collection[allowed_countries][0]': 'GB',
    'payment_intent_data[metadata][purpose]': 'hardware_shop',
    'payment_intent_data[metadata][sku]': items.map((i) => i.sku).join(','),
    'payment_intent_data[metadata][program_url]': primaryProgramUrl.slice(0, 450),
    'metadata[purpose]': 'hardware_shop',
    'metadata[sku]': items.map((i) => `${i.sku}x${i.quantity}`).join(','),
    'metadata[business_name]': businessName.slice(0, 200),
    'metadata[contact_name]': contactName.slice(0, 120),
    'metadata[program_url]': primaryProgramUrl.slice(0, 450),
    'metadata[google_url]': (googleUrl ?? '').slice(0, 450),
    'metadata[google_lookup]': googleLookup ? '1' : '0',
    'metadata[instagram_url]': (instagramUrl ?? '').slice(0, 450),
    'metadata[shipping_address]': address.slice(0, 200),
    'metadata[city]': city.slice(0, 100),
    'metadata[postcode]': postcode.slice(0, 32),
    'metadata[shipping_phone]': (body.shipping_phone ?? '').trim().slice(0, 40),
    'metadata[quantity]': String(totalUnits),
    'metadata[next_day]': priced.nextDay ? '1' : '0',
    'metadata[london_dropoff]': londonDropoff ? '1' : '0',
    'metadata[deal_total_pence]': String(priced.dealPence),
    'metadata[list_total_pence]': String(priced.listPence),
    'metadata[start_loyalty]': startLoyalty ? '1' : '0',
    'payment_intent_data[metadata][start_loyalty]': startLoyalty ? '1' : '0',
  });

  // Email collected on Stripe Checkout when not provided here
  if (email.includes('@')) {
    form.set('customer_email', email);
    form.set('metadata[email]', email);
  }

  // Stripe: cannot combine allow_promotion_codes with discounts[]
  if (couponId) {
    form.set('discounts[0][coupon]', couponId);
  } else {
    form.set('allow_promotion_codes', 'true');
  }

  priceIds.forEach((row, i) => {
    form.set(`line_items[${i}][price]`, row.priceId);
    form.set(`line_items[${i}][quantity]`, String(row.quantity));
  });

  try {
    const session = await stripePost('/checkout/sessions', form);
    const checkoutUrl = typeof session.url === 'string' ? session.url : null;
    const sessionId = typeof session.id === 'string' ? session.id : null;
    if (!checkoutUrl || !sessionId) {
      return { ok: false, status: 500, error: 'Failed to create checkout session' };
    }

    const first = items[0];
    return {
      ok: true,
      status: 200,
      checkoutUrl,
      sessionId,
      sku: first.sku,
      productName: items.length === 1
        ? HARDWARE_PRODUCTS[first.sku].name
        : `${items.length} NFC products`,
      priceGbp: HARDWARE_PRODUCTS[first.sku].priceGbp,
      totalGbp: penceToGbp(priced.dealPence),
      itemCount: totalUnits,
    };
  } catch (err) {
    return { ok: false, status: 500, error: (err as Error).message };
  }
}

export async function retrieveHardwareShopSession(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  email?: string;
  sku?: string;
  productName?: string;
  programUrl?: string;
  googleUrl?: string;
  instagramUrl?: string;
  paid?: boolean;
  businessName?: string;
  nextDay?: boolean;
  londonDropoff?: boolean;
  googleLookup?: boolean;
  amountTotal?: number;
  /** Buyer checked “Also start stamp loyalty” on NFC checkout */
  startLoyalty?: boolean;
}> {
  if (!sessionId.startsWith('cs_')) {
    return { ok: false, error: 'Invalid session' };
  }

  try {
    const session = await stripeGet(
      `/checkout/sessions/${sessionId}?expand[]=line_items`,
    );
    const purpose = (session.metadata as Record<string, string> | null)?.purpose;
    if (purpose !== 'hardware_shop') {
      return { ok: false, error: 'Not a hardware order' };
    }

    const meta = (session.metadata as Record<string, string>) ?? {};
    const customFields = (session.custom_fields as Array<{
      key?: string;
      text?: { value?: string | null };
    }> | null) ?? [];
    const customUrl = customFields.find((f) => f.key === 'program_url')?.text?.value?.trim();
    const programUrl = customUrl || meta.program_url || meta.google_url || meta.instagram_url || '';
    const sku = meta.sku || '';
    const firstSku = sku.split(',')[0]?.split('x')[0] ?? '';
    const product = parseHardwareSku(firstSku) ? HARDWARE_PRODUCTS[firstSku as HardwareSku] : null;
    const paid = session.payment_status === 'paid'
      || session.status === 'complete';

    return {
      ok: Boolean(paid),
      error: paid ? undefined : 'Payment not completed',
      email: meta.email || (typeof session.customer_email === 'string' ? session.customer_email : undefined),
      sku,
      productName: product?.name ?? (sku.includes(',') ? 'NFC order' : undefined),
      programUrl,
      googleUrl: meta.google_url || undefined,
      instagramUrl: meta.instagram_url || undefined,
      paid: Boolean(paid),
      businessName: meta.business_name,
      nextDay: meta.next_day === '1',
      londonDropoff: meta.london_dropoff === '1',
      googleLookup: meta.google_lookup === '1',
      amountTotal: typeof session.amount_total === 'number' ? session.amount_total : undefined,
      startLoyalty: meta.start_loyalty === '1',
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
