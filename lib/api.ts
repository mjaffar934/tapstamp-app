import { supabase } from './supabase';

/** Owner app + webhooks — always Supabase (JSON APIs) */
const supabaseApiBase = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

/** Customer-facing tap/pass URLs — tapstamp.co preferred */
const publicTapBase = (
  process.env.EXPO_PUBLIC_TAP_BASE_URL ??
  process.env.EXPO_PUBLIC_ORDER_WEBSITE_URL ??
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL
)?.replace(/\/$/, '');

function supabaseFn(path: string): string {
  if (!supabaseApiBase) return '';
  return `${supabaseApiBase}/functions/v1${path}`;
}

function publicPath(segment: string): string {
  if (!publicTapBase) return '';
  const path = segment.startsWith('/') ? segment : `/${segment}`;
  if (!publicTapBase.includes('supabase.co')) {
    return `${publicTapBase}${path}`;
  }
  return `${publicTapBase}/functions/v1${path}`;
}

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function authHeaders(contentType = 'application/json'): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (supabaseAnonKey) headers.apikey = supabaseAnonKey;

  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

export function publicEdgeHeaders(contentType = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (supabaseAnonKey) headers.apikey = supabaseAnonKey;
  return headers;
}

async function parseJsonResponse<T extends Record<string, unknown>>(
  res: Response,
  fallbackError: string,
): Promise<T & { error?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { error: res.ok ? fallbackError : `${fallbackError} (${res.status})` } as T & { error?: string };
  }
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: res.ok ? 'Invalid server response' : `${fallbackError} (${res.status})` };
  }
}

export async function callBaristaAction(
  serialNumber: string,
  action: 'stamp' | 'redeem',
  staffCode?: string,
  verifiedSpend?: number,
): Promise<{ error?: string; success?: boolean; stampCount?: number; isRedeemed?: boolean; minimumSpend?: number }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const body: Record<string, unknown> = { serial_number: serialNumber, action };
  if (verifiedSpend != null && Number.isFinite(verifiedSpend)) {
    body.verified_spend = verifiedSpend;
  }
  let headers: Record<string, string>;

  if (staffCode) {
    body.staff_code = staffCode;
    headers = publicEdgeHeaders();
  } else {
    headers = await authHeaders();
  }

  const res = await fetch(supabaseFn('/barista-action'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    stampCount?: number;
    minimumSpend?: number;
  }>(res, 'Action failed');
  if (!res.ok) return { error: data.error ?? 'Action failed', ...data };
  return data;
}

export async function authenticateStaff(
  code: string,
): Promise<{ error?: string; cafeId?: string; cafeName?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/staff-auth'), {
    method: 'POST',
    headers: publicEdgeHeaders(),
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
  const normalized = serial.trim();
  if (!normalized) return { error: 'Enter a name, code, or pass serial' };

  const isMemberCode = /^\d{4}$/.test(normalized);

  if (!options?.staffMode && !isMemberCode) {
    const { data, error } = await supabase
      .from('passes')
      .select('id, serial_number, customer_name, member_code, stamp_count, status, last_stamp_at')
      .eq('cafe_id', cafeId)
      .ilike('serial_number', normalized.toLowerCase())
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) return { pass: data as import('@/hooks/useBaristaData').BaristaPass };
  }

  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const lookupParam = isMemberCode
    ? `code=${encodeURIComponent(normalized)}`
    : `serial=${encodeURIComponent(normalized.toLowerCase())}`;
  const res = await fetch(
    `${supabaseFn(`/barista/${cafeId}`)}?${lookupParam}`,
    { headers: publicEdgeHeaders() },
  );
  const data = await parseJsonResponse<{ pass?: import('@/hooks/useBaristaData').BaristaPass }>(
    res,
    'Lookup failed',
  );
  if (!res.ok) return { error: data.error ?? 'Lookup failed' };
  if (!data.pass) return { error: 'No pass found for this cafe. Customer must tap your stamp first.' };
  return { pass: data.pass };
}

export async function sendCampaign(
  cafeId: string,
  message: string,
  schedule?: { startsAt?: string | null; endsAt?: string | null },
): Promise<{ error?: string; cleared?: boolean; sent?: number }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(`${supabaseFn(`/campaign/${cafeId}`)}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      message: message.trim(),
      starts_at: schedule?.startsAt ?? null,
      ends_at: schedule?.endsAt ?? null,
    }),
  });

  const data = await parseJsonResponse<{ cleared?: boolean; sent?: number }>(res, 'Send failed');
  if (!res.ok) return { error: data.error ?? 'Send failed' };
  return data;
}

export interface ProvisionCafePayload {
  name?: string;
  biz_type?: string;
  pass_template?: string;
  background_color?: string;
  foreground_color?: string;
  label_color?: string;
  show_customer_name_on_pass?: boolean;
  reward?: string;
  stamp_goal?: number;
  minimum_spend?: number | null;
  chip_code?: string;
  go_live?: boolean;
}

export async function provisionCafe(
  payload: ProvisionCafePayload,
): Promise<{ error?: string; cafeId?: string; staffCode?: string; trialStarted?: boolean }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/provision-cafe'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      return { error: 'Session expired — sign out and sign in again, then retry.' };
    }
    return { error: data.error ?? 'Provisioning failed' };
  }
  return data;
}

export async function linkChip(chipCode: string): Promise<{ error?: string; trialStarted?: boolean }> {
  const result = await provisionCafe({ chip_code: chipCode });
  if (result.error) return { error: result.error };
  return { trialStarted: result.trialStarted };
}

export async function ownerSignup(payload: {
  email: string;
  password: string;
  business_name: string;
  owner_name?: string;
}): Promise<{ error?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/owner-signup'), {
    method: 'POST',
    headers: publicEdgeHeaders(),
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      business_name: payload.business_name.trim(),
      owner_name: payload.owner_name?.trim() || undefined,
    }),
  });

  let data: { error?: string } = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    return {
      error: res.ok
        ? 'Invalid server response'
        : `Sign up failed (${res.status}). Check your connection and try again.`,
    };
  }

  if (!res.ok) {
    if (res.status === 404) {
      return { error: 'Sign up service unavailable. Please try again shortly.' };
    }
    return { error: data.error ?? `Sign up failed (${res.status})` };
  }
  return {};
}

export async function activateStamp(
  chipCode: string,
): Promise<{ error?: string; trialStarted?: boolean; chipCode?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/activate-stamp'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ chip_code: chipCode.trim().toUpperCase() }),
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      return { error: 'Session expired — sign out and sign in again, then retry.' };
    }
    return { error: data.error ?? 'Activation failed' };
  }
  return { trialStarted: data.trialStarted, chipCode: data.chipCode };
}

export interface GeneratedStamp {
  code: string;
  tapUrl: string;
  nfcUrl: string;
}

export async function adminGenerateChips(
  count: number,
): Promise<{ error?: string; stamps?: GeneratedStamp[] }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const secret = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? process.env.EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET ?? '';
  if (!secret) return { error: 'Admin secret not configured' };

  const res = await fetch(supabaseFn('/admin-generate-chips'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ secret, count }),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Could not generate codes' };
  return { stamps: data.stamps };
}

export interface AdminCreateClientPayload {
  email: string;
  password: string;
  business_name: string;
  owner_name?: string;
  plan: string;
  secret: string;
}

export async function adminCreateClient(
  payload: AdminCreateClientPayload,
): Promise<{ error?: string; userId?: string; businessId?: string; updated?: boolean }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/admin-create-client'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Could not create client' };
  return data;
}

import { File } from 'expo-file-system';

function logoContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function uploadCafeLogo(cafeId: string, logoUri: string): Promise<{ error?: string; url?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const contentType = logoContentType(logoUri);
  const file = new File(logoUri);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const res = await fetch(supabaseFn(`/upload-logo/${cafeId}`), {
    method: 'POST',
    headers: await authHeaders(contentType),
    body: bytes,
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Upload failed' };
  return { url: data.url };
}

export async function uploadCafeStrip(cafeId: string, stripUri: string): Promise<{ error?: string; url?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const contentType = logoContentType(stripUri);
  const file = new File(stripUri);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const res = await fetch(supabaseFn(`/upload-logo/${cafeId}?kind=strip`), {
    method: 'POST',
    headers: await authHeaders(contentType),
    body: bytes,
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? 'Upload failed' };
  return { url: data.url };
}

export async function designPassWithAi(
  cafeId?: string | null,
  options?: {
    bizType?: string | null;
    apply?: boolean;
    quiz?: {
      program_mode?: string;
      reward?: string;
      stamp_goal?: number;
      levels?: Array<{ stamp_count: number; reward: string }>;
      visit_frequency?: string;
      goal_priority?: string;
      business_name?: string;
      sells?: string;
      brand_colour?: string;
      vibe?: string;
    };
    /** Prefer cafe.pass_design_quiz when regenerating after onboarding lock */
    useLockedQuiz?: boolean;
  },
): Promise<{
  error?: string;
  suggestion?: {
    pass_template: 'classic';
    background_color: string;
    foreground_color: string;
    label_color: string;
    welcome_message: string;
    stamp_message: string;
    reward_message: string;
    reward?: string;
    stamp_goal?: number;
    levels?: Array<{ stamp_count: number; reward: string }>;
    rationale: string;
  };
  applied?: boolean;
  source?: 'ai' | 'fallback';
  fallback_reason?: string | null;
}> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  try {
    const path = cafeId ? `/ai-pass-design/${cafeId}` : '/ai-pass-design';
    const res = await fetch(supabaseFn(path), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        biz_type: options?.bizType ?? undefined,
        apply: options?.apply === true,
        quiz: options?.quiz ?? undefined,
        use_locked_quiz: options?.useLockedQuiz === true,
      }),
    });

    const data = await parseJsonResponse<{
      suggestion?: {
        pass_template: 'classic';
        background_color: string;
        foreground_color: string;
        label_color: string;
        welcome_message: string;
        stamp_message: string;
        reward_message: string;
        reward?: string;
        stamp_goal?: number;
        levels?: Array<{ stamp_count: number; reward: string }>;
        rationale: string;
      };
      applied?: boolean;
      source?: 'ai' | 'fallback';
      fallback_reason?: string | null;
    }>(res, 'AI design failed');

    if (!res.ok) return { error: data.error ?? 'AI design failed' };
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI design failed' };
  }
}

export async function openBillingPortal(setup = false): Promise<{ error?: string; portalUrl?: string }> {
  if (!supabaseApiBase) return { error: 'Supabase not configured' };

  const res = await fetch(supabaseFn('/billing-portal'), {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ setup }),
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
  payload: ProvisionCafePayload,
): Promise<{ error?: string; cafeId?: string; staffCode?: string }> {
  return provisionCafe(payload);
}
