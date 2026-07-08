import { supabase, functionsUrl, supabaseFunctionsUrl } from '../_shared/client.ts';
import { shouldSuspendCafe, shouldEnforceStarterLimit, STARTER_MONTHLY_CUSTOMER_LIMIT } from '../_shared/plans.ts';
import { countUniqueMonthlyCustomers } from '../_shared/usage.ts';
import { normalizeCafeBillingState } from '../_shared/subscription.ts';
import { applyStampToPass } from '../_shared/stampPass.ts';
import { isGoogleWalletConfigured } from '../_shared/googleWallet.ts';
import {
  alreadyStampedPage,
  chipNotActivatedPage,
  customerForm,
  errorPage,
  minimumSpendConfirmPage,
  minimumSpendStaffPage,
  minimumSpendDismissedPage,
  restoreCardFormPage,
  restoreNotFoundPage,
  capacityReachedPage,
  stampedPage,
  stampErrorPage,
  suspendedPage,
  thanksJoinedPage,
  welcomePage,
  joinLandingPage,
  redeemReadyPage,
  type CafeBrand,
} from '../_shared/html.ts';

type Cafe = CafeBrand & Record<string, unknown>;

function passLinks(serial: string, tapUrl: string) {
  return {
    apple: functionsUrl(`/pass/${serial}`),
    // Google Wallet redirects externally; Supabase URL works until tapstamp.co proxy is updated
    google: isGoogleWalletConfigured() ? supabaseFunctionsUrl(`/google-wallet/${serial}`) : null,
    thanks: `${tapUrl}?thanks=1&p=${encodeURIComponent(serial)}`,
  };
}

function minimumSpendAmount(cafe: Cafe): number | null {
  const amount = Number(cafe.minimum_spend);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function needsMinimumSpendConfirm(cafe: Cafe, confirmed: boolean): boolean {
  return minimumSpendAmount(cafe) != null && !confirmed;
}

function passCookie(cafeId: string, serial: string): string {
  return `pass_${cafeId}=${serial}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function html(body: string, setCookie?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(body, { headers });
}

function isAndroid(req: Request): boolean {
  return /android/i.test(req.headers.get('user-agent') || '');
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const code = parts[parts.length - 1] || url.searchParams.get('code') || '';
    const restore = url.searchParams.get('restore') === '1';
    const dismissed = url.searchParams.get('dismissed') === '1';
    const confirmed = url.searchParams.get('confirmed') === '1';
    const welcome = url.searchParams.get('welcome') === '1';
    const thanks = url.searchParams.get('thanks') === '1';
    const isNew = url.searchParams.get('new') === '1';
    const passSerial = url.searchParams.get('p')?.trim() || '';

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
      const contentType = req.headers.get('content-type') ?? '';
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const form = await req.formData();
        const serial = String(form.get('serial') ?? '');
        if (serial) {
          return await handleSaveCustomerPost(form, cafe as Cafe, brand, tapUrl, isAndroid(req));
        }
        return await handleRestorePostForm(form, cafe as Cafe, brand, tapUrl);
      }
      return await handleRestorePost(req, cafe as Cafe, brand, tapUrl);
    }

    if (restore) {
      return html(restoreCardFormPage(brand, tapUrl));
    }

    if (passSerial) {
      const { data: pass } = await supabase
        .from('passes')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('serial_number', passSerial)
        .maybeSingle();

      if (pass) {
        const cookie = passCookie(String(cafe.id), pass.serial_number);

        if (thanks) {
          return html(thanksJoinedPage(brand, Number(pass.stamp_count)), cookie);
        }

        if (welcome) {
          const links = passLinks(pass.serial_number, tapUrl);
          const hasWallet = Boolean(pass.push_token);
          return html(welcomePage(
            brand,
            pass.serial_number,
            Number(pass.stamp_count),
            links.apple,
            links.google,
            links.thanks,
            hasWallet,
          ), cookie);
        }

        return new Response(null, {
          status: 302,
          headers: { Location: tapUrl, 'Set-Cookie': cookie },
        });
      }
    }

    const cookies = req.headers.get('cookie') || '';
    const cookieKey = `pass_${cafe.id}`;
    const match = cookies.match(new RegExp(`(?:^|;)\\s*${cookieKey}=([^;]+)`));
    const existingSerial = match?.[1] ?? null;

    if (existingSerial) {
      const { data: pass } = await supabase
        .from('passes')
        .select('*')
        .eq('serial_number', existingSerial)
        .single();

      if (pass) {
        if (thanks) {
          return html(thanksJoinedPage(brand, Number(pass.stamp_count)), passCookie(String(cafe.id), existingSerial));
        }

        if (welcome) {
          const links = passLinks(existingSerial, tapUrl);
          const hasWallet = Boolean(pass.push_token);
          return html(welcomePage(
            brand,
            existingSerial,
            Number(pass.stamp_count),
            links.apple,
            links.google,
            links.thanks,
            hasWallet,
          ), passCookie(String(cafe.id), existingSerial));
        }

        if (pass.status === 'redeemed') {
          return html(redeemReadyPage(brand), passCookie(String(cafe.id), existingSerial));
        }

        return await stampExistingPass(
          cafe as Cafe,
          brand,
          pass,
          existingSerial,
          tapUrl,
          confirmed,
          isAndroid(req),
        );
      }
    }

    if (welcome || thanks) {
      return html(joinLandingPage(brand, tapUrl));
    }

    if (!isNew) {
      return html(joinLandingPage(brand, tapUrl));
    }

    // Never create a second card if this device already has one for this cafe
    if (existingSerial) {
      const { data: existingPass } = await supabase
        .from('passes')
        .select('*')
        .eq('serial_number', existingSerial)
        .maybeSingle();
      if (existingPass) {
        const links = passLinks(existingSerial, tapUrl);
        return html(
          welcomePage(
            brand,
            existingSerial,
            Number(existingPass.stamp_count),
            links.apple,
            links.google,
            links.thanks,
          ),
          passCookie(String(cafe.id), existingSerial),
        );
      }
    }

    return await createNewPass(
      cafe as Cafe,
      brand,
      String(cafe.id),
      code,
      cookieKey,
      tapUrl,
      confirmed,
      isAndroid(req),
    );
  } catch (err) {
    console.error('Tap error:', err);
    return html(errorPage('Something went wrong. Please tap again.'));
  }
});

async function handleSaveCustomerPost(
  form: FormData,
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
  android: boolean,
): Promise<Response> {
  const serial = String(form.get('serial') ?? '');
  const customerName = form.get('customer_name') ? String(form.get('customer_name')) : null;
  const customerEmail = form.get('customer_email') ? String(form.get('customer_email')) : null;
  const birthday = form.get('birthday') ? String(form.get('birthday')) : null;

  if (!serial) {
    return html(errorPage('Missing loyalty card. Please tap again.'));
  }

  const updates: Record<string, string | null> = {};
  if (customerName) updates.customer_name = customerName;
  if (customerEmail) updates.customer_email = customerEmail;
  if (birthday) updates.birthday = birthday;
  if (Object.keys(updates).length > 0) {
    await supabase.from('passes').update(updates).eq('serial_number', serial);
  }

  const { data: pass } = await supabase
    .from('passes')
    .select('*')
    .eq('serial_number', serial)
    .single();

  const count = Number(pass?.stamp_count ?? 1);
  const links = passLinks(serial, tapUrl);

  return html(
    welcomePage(brand, serial, count, links.apple, links.google, links.thanks),
    passCookie(String(cafe.id), serial),
  );
}

async function handleRestorePostForm(
  form: FormData,
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
): Promise<Response> {
  const email = String(form.get('customer_email') ?? '').trim().toLowerCase();
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

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${tapUrl}?welcome=1`,
      'Set-Cookie': passCookie(String(cafe.id), pass.serial_number),
    },
  });
}

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

  const cookie = passCookie(String(cafe.id), pass.serial_number);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${tapUrl}?welcome=1`,
      'Set-Cookie': cookie,
    },
  });
}

async function stampExistingPass(
  cafe: Cafe,
  brand: CafeBrand,
  pass: Record<string, unknown>,
  serial: string,
  tapUrl: string,
  confirmed: boolean,
  android: boolean,
): Promise<Response> {
  const cookie = passCookie(String(cafe.id), serial);

  if (pass.status === 'redeemed') {
    return html(redeemReadyPage(brand), cookie);
  }

  const minSpend = minimumSpendAmount(cafe);
  if (minSpend != null) {
    return html(minimumSpendStaffPage(brand, minSpend), cookie);
  }

  const result = await applyStampToPass(cafe, pass);

  if (!result.ok) {
    if (result.error === 'redeem_pending') {
      return html(redeemReadyPage(brand), cookie);
    }
    if (result.error === 'cooldown') {
      return html(alreadyStampedPage(brand, Number(pass.stamp_count)), cookie);
    }
    return html(stampErrorPage(brand));
  }

  return html(
    stampedPage(brand, result.stampCount ?? 0, result.rewardJustUnlocked ?? false),
    cookie,
  );
}

async function createNewPass(
  cafe: Cafe,
  brand: CafeBrand,
  cafeId: string,
  chipCode: string,
  cookieKey: string,
  tapUrl: string,
  confirmed: boolean,
  android: boolean,
): Promise<Response> {
  const minSpend = minimumSpendAmount(cafe);
  if (minSpend != null) {
    return html(minimumSpendStaffPage(brand, minSpend));
  }

  if (shouldEnforceStarterLimit(String(cafe.plan), cafe.trial_ends_at as string | null)) {
    const count = await countUniqueMonthlyCustomers(cafeId);
    if (count >= STARTER_MONTHLY_CUSTOMER_LIMIT) {
      return html(capacityReachedPage(brand));
    }
  }

  const serial = crypto.randomUUID();
  const authToken = crypto.randomUUID().replace(/-/g, '');

  const { data: newPass, error: passError } = await supabase
    .from('passes')
    .insert({
      cafe_id: cafeId,
      serial_number: serial,
      auth_token: authToken,
      stamp_count: 1,
      status: 'active',
      last_stamp_at: null,
      lifetime_stamps: 1,
    })
    .select()
    .single();

  if (passError || !newPass) {
    throw new Error(passError?.message ?? 'Failed to create pass');
  }

  await supabase.from('stamps').insert({ pass_id: newPass.id, cafe_id: cafeId });

  const cookie = passCookie(cafeId, serial);
  const links = passLinks(serial, tapUrl);

  if (cafe.collect_customer_details) {
    return html(customerForm(brand, serial, chipCode, tapUrl), cookie);
  }

  return html(
    welcomePage(brand, serial, 1, links.apple, links.google, links.thanks),
    cookie,
  );
}
