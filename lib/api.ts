import { supabase } from './supabase';

/** Owner app + webhooks — always Supabase (JSON APIs) */
const supabaseApiBase = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

/** Customer-facing tap/pass URLs — Railway proxy or Supabase */
const publicTapBase = (
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL
)?.replace(/\/$/, '');

function supabaseFn(path: string): string {
  if (!supabaseApiBase) return '';
  return `${supabaseApiBase}/functions/v1${path}`;
}

/** Railway uses /tap at root; Supabase uses /functions/v1/tap */
function publicPath(segment: string): string {
  if (!publicTapBase) return '';
  if (publicTapBase.includes('.supabase.co')) {
    return `${publicTapBase}/functions/v1${segment}`;
  }
  return `${publicTapBase}${segment}`;
}

export async function authHeaders(contentType = 'application/json'): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function callBaristaAction(
  serialNumber: string,
  action: 'stamp' | 'redeem',
  staffCode?: string,
): Promise<{ error?: string; success?: boolean; stampCount?: number; isRedeemed?: boolean }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const body: Record<string, string> = { serial_number: serialNumber, action };
  let headers: Record<string, string>;

  if (staffCode) {
    body.staff_code = staffCode;
    headers = { 'Content-Type': 'application/json' };
  } else {
    headers = await authHeaders();
  }

  const res = await fetch(supabaseFn('/barista-action'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Action failed', ...data };
  return data;
}

export async function authenticateStaff(
  code: string,
): Promise<{ error?: string; cafeId?: string; cafeName?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/staff-auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Invalid staff code' };
  return data;
}

export async function lookupBaristaPass(
  cafeId: string,
  serial: string,
  options?: { staffMode?: boolean },
): Promise<{ error?: string; pass?: import('@/hooks/useBaristaData').BaristaPass }> {
  const normalized = serial.trim().toLowerCase();
  if (!normalized) return { error: 'Enter a pass serial' };

  if (!options?.staffMode) {
    const { data, error } = await supabase
      .from('passes')
      .select('id, serial_number, customer_name, stamp_count, status, last_stamp_at')
      .eq('cafe_id', cafeId)
      .ilike('serial_number', normalized)
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) return { pass: data as import('@/hooks/useBaristaData').BaristaPass };
  }

  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(
    `${supabaseFn(`/barista/${cafeId}`)}?serial=${encodeURIComponent(normalized)}`,
  );
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Lookup failed' };
  if (!data.pass) return { error: 'No pass found for this cafe. Customer must tap your stamp first.' };
  return { pass: data.pass };
}

export async function sendCampaign(
  cafeId: string,
  message: string,
): Promise<{ error?: string; sent?: number }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(`${supabaseFn(`/campaign/${cafeId}`)}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ message: message.trim() }),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Send failed' };
  return { sent: data.sent ?? 0 };
}

export interface ProvisionCafePayload {
  name?: string;
  biz_type?: string;
  background_color?: string;
  foreground_color?: string;
  label_color?: string;
  show_customer_name_on_pass?: boolean;
  reward?: string;
  stamp_goal?: number;
  minimum_spend?: number | null;
  chip_code?: string;
}

export async function provisionCafe(
  payload: ProvisionCafePayload,
): Promise<{ error?: string; cafeId?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/provision-cafe'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Provisioning failed' };
  return data;
}

export async function linkChip(chipCode: string): Promise<{ error?: string }> {
  const result = await provisionCafe({ chip_code: chipCode });
  return result.error ? { error: result.error } : {};
}

export async function uploadCafeLogo(cafeId: string, logoUri: string): Promise<{ error?: string; url?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const blob = await fetch(logoUri).then((res) => res.blob());
  const res = await fetch(supabaseFn(`/upload-logo/${cafeId}`), {
    method: 'POST',
    headers: await authHeaders(blob.type || 'image/png'),
    body: blob,
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Upload failed' };
  return { url: data.url };
}

export async function openBillingPortal(): Promise<{ error?: string; portalUrl?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/billing-portal'), {
    method: 'POST',
    headers: await authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Could not open billing portal' };
  return { portalUrl: data.portalUrl };
}

export async function resumeCheckout(): Promise<{ error?: string; checkoutUrl?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/resume-checkout'), {
    method: 'POST',
    headers: await authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Could not resume checkout' };
  return { checkoutUrl: data.checkoutUrl };
}

export async function markKitReceived(): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { error: 'Not signed in' };

  const { error } = await supabase
    .from('businesses')
    .update({ kit_received: true, order_status: 'delivered' } as never)
    .eq('owner_id', session.user.id);

  if (error) return { error: error.message };
  return {};
}

export async function createOrder(payload: {
  owner_name?: string;
  business_name?: string;
  email: string;
  password: string;
  city?: string;
  postcode?: string;
}): Promise<{ error?: string; message?: string; success?: boolean }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/create-order'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Order failed', message: data.message };
  return data;
}

export function tapUrl(chipCode: string): string {
  return publicPath(`/tap/${chipCode}`);
}

export function chipLinkUrl(chipCode: string): string {
  return `tapstamp://link-chip/${chipCode}`;
}

export async function finalizeOnboarding(
  payload: ProvisionCafePayload & { chip_code: string },
): Promise<{ error?: string; cafeId?: string }> {
  return provisionCafe(payload);
}
