import { supabase, functionsUrl } from '../_shared/client.ts';
import { shouldSuspendCafe, shouldEnforceStarterLimit, STARTER_MONTHLY_CUSTOMER_LIMIT } from '../_shared/plans.ts';
import { countUniqueMonthlyCustomers } from '../_shared/usage.ts';
import { normalizeCafeBillingState } from '../_shared/subscription.ts';
import { applyStampToPass } from '../_shared/stampPass.ts';
import {
  alreadyStampedPage,
  chipNotActivatedPage,
  customerForm,
  errorPage,
  minimumSpendConfirmPage,
  minimumSpendDismissedPage,
  restoreCardFormPage,
  restoreNotFoundPage,
  returningVisitorPage,
  capacityReachedPage,
  stampedPage,
  stampErrorPage,
  suspendedPage,
  welcomePage,
  type CafeBrand,
} from '../_shared/html.ts';

type Cafe = CafeBrand & Record<string, unknown>;

function minimumSpendAmount(cafe: Cafe): number | null {
  const amount = Number(cafe.minimum_spend);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function needsMinimumSpendConfirm(cafe: Cafe, confirmed: boolean): boolean {
  return minimumSpendAmount(cafe) != null && !confirmed;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const code = parts[parts.length - 1] || url.searchParams.get('code') || '';
    const restore = url.searchParams.get('restore') === '1';
    const forceNew = url.searchParams.get('new') === '1';
    const dismissed = url.searchParams.get('dismissed') === '1';
    const confirmed = url.searchParams.get('confirmed') === '1';

    if (!code) return new Response('Not found', { status: 404 });

    const tapUrl = functionsUrl(`/tap/${code}`);

    const { data: chip } = await supabase.from('chips').select('*').ilike('code', code).single();

    if (!chip?.cafe_id) {
      return html(chipNotActivatedPage());
    }

    const { data: cafe } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', chip.cafe_id)
      .single();

    if (!cafe) return html(errorPage('This loyalty programme could not be found.'));

    const brand = cafe as CafeBrand;

    await normalizeCafeBillingState({
      id: String(cafe.id),
      plan: String(cafe.plan),
      trial_ends_at: cafe.trial_ends_at as string | null,
      subscription_status: cafe.subscription_status as string | undefined,
      email: cafe.email as string | undefined,
    });

    if (shouldSuspendCafe(cafe)) {
      if (cafe.status !== 'suspended') {
        await supabase.from('cafes').update({ status: 'suspended' }).eq('id', cafe.id);
      }
      return html(suspendedPage(brand));
    }

    if (dismissed && minimumSpendAmount(cafe as Cafe) != null) {
      return html(minimumSpendDismissedPage(brand));
    }

    if (req.method === 'POST') {
      return await handleRestorePost(req, cafe as Cafe, brand, tapUrl);
    }

    const cookies = req.headers.get('cookie') || '';
    const cookieKey = `pass_${cafe.id}`;
    const match = cookies.match(new RegExp(`(?:^|;)\\s*${cookieKey}=([^;]+)`));
    const existingSerial = match?.[1] ?? null;
    const isAndroid = /android/i.test(req.headers.get('user-agent') || '');

    if (existingSerial) {
      const { data: pass } = await supabase
        .from('passes')
        .select('*')
        .eq('serial_number', existingSerial)
        .single();

      if (pass) {
        return await stampExistingPass(cafe as Cafe, brand, pass, existingSerial, tapUrl, confirmed);
      }
    }

    if (restore) {
      return html(restoreCardFormPage(brand, tapUrl));
    }

    if (cafe.collect_customer_details && !forceNew) {
      return html(returningVisitorPage(brand, tapUrl));
    }

    return await createNewPass(cafe as Cafe, brand, isAndroid, cookieKey, tapUrl, confirmed);
  } catch (err) {
    console.error('Tap error:', err);
    return html(errorPage('Something went wrong. Please tap again.'));
  }
});

async function handleRestorePost(
  req: Request,
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
): Promise<Response> {
  const contentType = req.headers.get('content-type') ?? '';
  let email = '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    email = String(form.get('customer_email') ?? '').trim().toLowerCase();
  } else {
    const body = await req.json();
    email = String(body.customer_email ?? '').trim().toLowerCase();
  }

  if (!email) {
    return html(restoreCardFormPage(brand, tapUrl));
  }

  const { data: pass } = await supabase
    .from('passes')
    .select('*')
    .eq('cafe_id', cafe.id)
    .ilike('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pass) {
    return html(restoreNotFoundPage(brand, tapUrl, email));
  }

  const cookieKey = `pass_${cafe.id}`;
  const cookie = `${cookieKey}=${pass.serial_number}; Max-Age=31536000; Path=/; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: tapUrl,
      'Set-Cookie': cookie,
    },
  });
}

async function stampExistingPass(
  cafe: Cafe,
  brand: CafeBrand,
  pass: Record<string, unknown>,
  _existingSerial: string,
  tapUrl: string,
  confirmed: boolean,
): Promise<Response> {
  const minSpend = minimumSpendAmount(cafe);
  if (needsMinimumSpendConfirm(cafe, confirmed) && minSpend != null) {
    return html(minimumSpendConfirmPage(brand, tapUrl, minSpend));
  }

  const result = await applyStampToPass(cafe, pass);

  if (!result.ok) {
    if (result.error === 'cooldown') {
      return html(alreadyStampedPage(brand, Number(pass.stamp_count), result.cooldownHoursLeft ?? 1));
    }
    return html(stampErrorPage(brand));
  }

  return html(stampedPage(brand, result.stampCount ?? 0, result.isRedeemed ?? false));
}

async function createNewPass(
  cafe: Cafe,
  brand: CafeBrand,
  isAndroid: boolean,
  cookieKey: string,
  tapUrl: string,
  confirmed: boolean,
): Promise<Response> {
  const minSpend = minimumSpendAmount(cafe);
  if (needsMinimumSpendConfirm(cafe, confirmed) && minSpend != null) {
    return html(minimumSpendConfirmPage(brand, tapUrl, minSpend));
  }

  if (shouldEnforceStarterLimit(String(cafe.plan), cafe.trial_ends_at as string | null)) {
    const count = await countUniqueMonthlyCustomers(String(cafe.id));
    if (count >= STARTER_MONTHLY_CUSTOMER_LIMIT) {
      return html(capacityReachedPage(brand));
    }
  }

  const serial = crypto.randomUUID();
  const authToken = crypto.randomUUID().replace(/-/g, '');

  const { data: newPass, error: passError } = await supabase
    .from('passes')
    .insert({
      cafe_id: cafe.id,
      serial_number: serial,
      auth_token: authToken,
      stamp_count: 1,
      status: 'active',
      last_stamp_at: new Date().toISOString(),
      lifetime_stamps: 1,
    })
    .select()
    .single();

  if (passError || !newPass) {
    throw new Error(passError?.message ?? 'Failed to create pass');
  }

  await supabase.from('stamps').insert({ pass_id: newPass.id, cafe_id: cafe.id });

  const cookie = `${cookieKey}=${serial}; Max-Age=31536000; Path=/; SameSite=Lax`;
  const walletUrl = functionsUrl(`/wallet/${serial}`);
  const saveUrl = functionsUrl('/save-customer');

  if (cafe.collect_customer_details) {
    return html(customerForm(brand, serial, saveUrl), cookie);
  }

  return html(welcomePage(brand, serial, 1, walletUrl, isAndroid), cookie);
}

function html(body: string, setCookie?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(body, { headers });
}

