import { supabase, functionsUrl } from '../_shared/client.ts';
import { shouldSuspendCafe, shouldEnforceStarterLimit, STARTER_MONTHLY_CUSTOMER_LIMIT } from '../_shared/plans.ts';
import { countUniqueMonthlyCustomers } from '../_shared/usage.ts';
import { normalizeCafeBillingState } from '../_shared/subscription.ts';
import { applyStampToPass, applyRedeemRestartAndStamp, hasStampedToday, customerStampLimitsActive } from '../_shared/stampPass.ts';
import { generateUniqueMemberCode, ensureMemberCode } from '../_shared/memberCode.ts';
import { isGoogleWalletConfigured, isGoogleWalletPublic } from '../_shared/googleWallet.ts';
import { isDoubleStampWindow } from '../_shared/utils.ts';
import { upgradeStarterAtCustomerLimit } from '../_shared/subscription.ts';
import {
  chipNotActivatedPage,
  customerForm,
  errorPage,
  minimumSpendConfirmPage,
  minimumSpendStaffPage,
  minimumSpendDismissedPage,
  restoreCardFormPage,
  restoreNotFoundPage,
  restoreCardsPage,
  capacityReachedPage,
  stampedPage,
  stampErrorPage,
  suspendedPage,
  thanksJoinedPage,
  alreadyStampedPage,
  welcomePage,
  addToWalletPage,
  joinLandingPage,
  redeemReadyPage,
  rewardRedeemedPage,
  rewardRestartPage,
  lostWalletPage,
  type CafeBrand,
} from '../_shared/html.ts';

type Cafe = CafeBrand & Record<string, unknown>;

function passLinks(serial: string, tapUrl: string) {
  return {
    apple: functionsUrl(`/pass/${serial}`),
    google: isGoogleWalletConfigured() ? functionsUrl(`/google-wallet/${serial}`) : null,
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
  return `pass_${cafeId}=${serial}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}

function newPassCookie(cafeId: string, serial: string): string {
  return appendCookie(passCookie(cafeId, serial), clearRedeemSeenCookie(cafeId));
}

function redeemSeenCookie(cafeId: string): string {
  return `redeem_seen_${cafeId}=1; Max-Age=604800; Path=/; SameSite=Lax; Secure`;
}

function clearRedeemSeenCookie(cafeId: string): string {
  return `redeem_seen_${cafeId}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

function appendCookie(base: string, extra: string): string {
  return base ? `${base}; ${extra}` : extra;
}

async function markWalletAdded(serial: string): Promise<void> {
  await supabase
    .from('passes')
    .update({ wallet_added_at: new Date().toISOString() })
    .eq('serial_number', serial);
}

async function maybeShowRedeemAck(
  pass: Record<string, unknown>,
  brand: CafeBrand,
  cafeId: string,
  serial: string,
): Promise<Response | null> {
  if (!pass.redeem_ack_pending) return null;

  await supabase.from('passes').update({ redeem_ack_pending: false }).eq('serial_number', serial);

  const memberCode = pass.member_code ? String(pass.member_code) : undefined;
  const count = Number(pass.stamp_count) || 0;
  const continued = count > 0;
  return html(
    rewardRedeemedPage(brand, count, memberCode, continued, serial),
    passCookie(cafeId, serial),
  );
}

function html(body: string, setCookie?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(body, { headers });
}

function isAndroid(req: Request): boolean {
  return /android/i.test(req.headers.get('user-agent') || '');
}

function walletSetupUrl(tapUrl: string, serial: string, fromLost = false): string {
  const u = new URL(tapUrl);
  u.searchParams.set('setup', '1');
  u.searchParams.set('p', serial);
  if (fromLost) u.searchParams.set('lost', '1');
  return u.toString();
}

function redirectToWalletSetup(tapUrl: string, serial: string, cafeId: string, fresh = false): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: walletSetupUrl(tapUrl, serial),
      'Set-Cookie': fresh ? newPassCookie(cafeId, serial) : passCookie(cafeId, serial),
    },
  });
}

function passResultUrl(
  tapUrl: string,
  serial: string,
  view: 'stamped' | 'reward' | 'cooldown' | 'restarted',
  stampCount?: number,
): string {
  const u = new URL(tapUrl);
  u.searchParams.set('p', serial);
  u.searchParams.set(view, '1');
  if (stampCount != null) u.searchParams.set('n', String(stampCount));
  return u.toString();
}

function redirectToPassResult(
  tapUrl: string,
  serial: string,
  cafeId: string,
  view: 'stamped' | 'reward' | 'cooldown' | 'restarted',
  cookie: string,
  extraCookie?: string,
  stampCount?: number,
): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: passResultUrl(tapUrl, serial, view, stampCount),
      'Set-Cookie': extraCookie ? appendCookie(cookie, extraCookie) : cookie,
    },
  });
}

function walletSetupPage(
  brand: CafeBrand,
  serial: string,
  count: number,
  tapUrl: string,
  cafeId: string,
  preferGoogle = false,
  fromLostWallet = false,
): Response {
  const links = passLinks(serial, tapUrl);
  return html(
    addToWalletPage(
      brand,
      count,
      links.apple,
      links.google,
      links.thanks,
      serial,
      cafeId,
      preferGoogle,
      fromLostWallet,
      Boolean(links.google) && !isGoogleWalletPublic(),
    ),
    passCookie(cafeId, serial),
  );
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
    const setup = url.searchParams.get('setup') === '1';
    const isNew = url.searchParams.get('new') === '1';
    const join = url.searchParams.get('join') === '1';
    const attemptStamp = url.searchParams.get('stamp') === '1';
    const stampedView = url.searchParams.get('stamped') === '1';
    const rewardView = url.searchParams.get('reward') === '1';
    const cooldownView = url.searchParams.get('cooldown') === '1';
    const restartedView = url.searchParams.get('restarted') === '1';
    const lostWallet = url.searchParams.get('lost') === '1';
    const passSerial = url.searchParams.get('p')?.trim() || '';
    const android = isAndroid(req);

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

    const { data: rewardTiers } = await supabase
      .from('reward_tiers')
      .select('stamp_count, reward')
      .eq('cafe_id', cafe.id)
      .order('stamp_count');

    const brand = {
      ...(cafe as CafeBrand),
      reward_tiers: (rewardTiers ?? []) as CafeBrand['reward_tiers'],
    };

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
        return await handleRestorePostForm(form, cafe as Cafe, brand, tapUrl, isAndroid(req));
      }
      return await handleRestorePost(req, cafe as Cafe, brand, tapUrl, isAndroid(req));
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

      if (join) {
        if (!pass) {
          return html(errorPage('Card not found. Tap Join to start again.'));
        }
        return html(customerForm(brand, pass.serial_number, code, tapUrl), passCookie(String(cafe.id), pass.serial_number));
      }

      if (pass) {
        const cookie = passCookie(String(cafe.id), pass.serial_number);

        if (stampedView) {
          const count = Number(url.searchParams.get('n') ?? pass.stamp_count);
          const pending = pass.pending_milestone_reward
            ? String(pass.pending_milestone_reward)
            : null;
          return html(
            stampedPage(brand, count, Boolean(pending) || pass.status === 'redeemed', pass.serial_number, pending),
            cookie,
          );
        }

        if (restartedView) {
          const count = Number(url.searchParams.get('n') ?? pass.stamp_count);
          return html(rewardRestartPage(brand, count, pass.serial_number), cookie);
        }

        if (rewardView) {
          const pending = pass.pending_milestone_reward
            ? String(pass.pending_milestone_reward)
            : null;
          return html(
            redeemReadyPage(
              brand,
              pass.serial_number,
              pending ?? undefined,
              Number(pass.stamp_count),
            ),
            appendCookie(cookie, redeemSeenCookie(String(cafe.id))),
          );
        }

        if (cooldownView) {
          const pending = pass.pending_milestone_reward
            ? String(pass.pending_milestone_reward)
            : null;
          if (pending || pass.status === 'redeemed') {
            return html(redeemReadyPage(brand, pass.serial_number, pending ?? undefined, Number(pass.stamp_count)), cookie);
          }
          return html(alreadyStampedPage(brand, Number(pass.stamp_count), pass.serial_number), cookie);
        }

        if (thanks) {
          await markWalletAdded(pass.serial_number);
          return html(
            thanksJoinedPage(
              brand,
              Number(pass.stamp_count),
              pass.serial_number,
              `${tapUrl}?setup=1&p=${encodeURIComponent(pass.serial_number)}`,
            ),
            cookie,
          );
        }

        if (lostWallet && !setup) {
          return html(
            lostWalletPage(
              brand,
              pass.serial_number,
              walletSetupUrl(tapUrl, pass.serial_number, true),
            ),
            cookie,
          );
        }

        // Always show Add to Wallet on setup (re-add after phone wipe / restore).
        if (setup) {
          return walletSetupPage(
            brand,
            pass.serial_number,
            Number(pass.stamp_count),
            tapUrl,
            String(cafe.id),
            android,
            lostWallet,
          );
        }

        if (welcome) {
          return html(welcomePage(brand, Number(pass.stamp_count), pass.serial_number), cookie);
        }

        const ack = await maybeShowRedeemAck(pass, brand, String(cafe.id), pass.serial_number);
        if (ack) return ack;

        if (pass.status === 'redeemed' && !attemptStamp) {
          return html(redeemReadyPage(brand, pass.serial_number, undefined, Number(pass.stamp_count)), cookie);
        }

        if (!attemptStamp) {
          return await viewPassStatus(cafe as Cafe, brand, pass, pass.serial_number);
        }

        return await stampExistingPass(
          cafe as Cafe,
          brand,
          pass,
          pass.serial_number,
          tapUrl,
          confirmed,
          isAndroid(req),
        );
      }

      if (thanks) {
        return html(errorPage('Card not found. Tap Join to start again.'));
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
          await markWalletAdded(existingSerial);
          return html(
            thanksJoinedPage(
              brand,
              Number(pass.stamp_count),
              existingSerial,
              `${tapUrl}?setup=1&p=${encodeURIComponent(existingSerial)}`,
            ),
            passCookie(String(cafe.id), existingSerial),
          );
        }

        if (lostWallet && !setup) {
          return html(
            lostWalletPage(
              brand,
              existingSerial,
              walletSetupUrl(tapUrl, existingSerial, true),
            ),
            passCookie(String(cafe.id), existingSerial),
          );
        }

        if (setup) {
          return walletSetupPage(
            brand,
            existingSerial,
            Number(pass.stamp_count),
            tapUrl,
            String(cafe.id),
            android,
            lostWallet,
          );
        }

        if (welcome) {
          return html(welcomePage(brand, Number(pass.stamp_count), existingSerial), passCookie(String(cafe.id), existingSerial));
        }

        const ack = await maybeShowRedeemAck(pass, brand, String(cafe.id), existingSerial);
        if (ack) return ack;

        // Match ?p= behaviour: wait for staff to redeem; don't auto-restart on every visit.
        if (pass.status === 'redeemed') {
          return html(redeemReadyPage(brand, existingSerial, undefined, Number(pass.stamp_count)), passCookie(String(cafe.id), existingSerial));
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

    if (thanks && !existingSerial && !passSerial) {
      return html(joinLandingPage(brand, tapUrl));
    }

    if (!existingSerial && !passSerial) {
      if (isNew) {
        return await createNewPass(
          cafe as Cafe,
          brand,
          String(cafe.id),
          code,
          cookieKey,
          tapUrl,
          confirmed,
          isAndroid(req),
          req,
        );
      }

      // No cookie / pass → Join. Fingerprint only blocks farming on explicit Join (?new=1).
      return html(joinLandingPage(brand, tapUrl));
    }

    return html(joinLandingPage(brand, tapUrl));
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

  // Same email should not create / keep multiple welcome-stamp cards.
  if (customerEmail) {
    const { data: existingByEmail } = await supabase
      .from('passes')
      .select('serial_number')
      .eq('cafe_id', cafe.id)
      .ilike('customer_email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingByEmail?.serial_number && existingByEmail.serial_number !== serial) {
      await supabase.from('passes').update({
        ...(customerName ? { customer_name: customerName } : {}),
        ...(birthday ? { birthday } : {}),
        customer_email: customerEmail,
      }).eq('serial_number', existingByEmail.serial_number);
      return redirectToWalletSetup(tapUrl, existingByEmail.serial_number, String(cafe.id));
    }
  }

  const updates: Record<string, string | null> = {};
  if (customerName) updates.customer_name = customerName;
  if (customerEmail) updates.customer_email = customerEmail;
  if (birthday) updates.birthday = birthday;
  if (Object.keys(updates).length > 0) {
    await supabase.from('passes').update(updates).eq('serial_number', serial);
  }

  return redirectToWalletSetup(tapUrl, serial, String(cafe.id));
}

async function handleRestorePostForm(
  form: FormData,
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
  preferGoogle = false,
): Promise<Response> {
  const email = String(form.get('customer_email') ?? '').trim().toLowerCase();
  if (!email) {
    return html(restoreCardFormPage(brand, tapUrl));
  }
  return restorePassesForEmail(cafe, brand, tapUrl, email, preferGoogle);
}

async function handleRestorePost(
  req: Request,
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
  preferGoogle = false,
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
  return restorePassesForEmail(cafe, brand, tapUrl, email, preferGoogle);
}

async function restorePassesForEmail(
  cafe: Cafe,
  brand: CafeBrand,
  tapUrl: string,
  email: string,
  preferGoogle: boolean,
): Promise<Response> {
  const cafeId = String(cafe.id);

  const { data: passes } = await supabase
    .from('passes')
    .select('serial_number, stamp_count, status, member_code, cafe_id, created_at, cafes(id, name, stamp_goal)')
    .ilike('customer_email', email)
    .order('created_at', { ascending: false });

  const rows = (passes ?? []).filter((p) => p.serial_number);
  if (!rows.length) {
    return html(restoreNotFoundPage(brand, tapUrl, email));
  }

  type CafeEmbed = { id: string; name: string; stamp_goal: number } | null;
  const cards = rows.map((p) => {
    const cafeRow = (Array.isArray(p.cafes) ? p.cafes[0] : p.cafes) as CafeEmbed;
    const serial = String(p.serial_number);
    const links = passLinks(serial, tapUrl);
    const isCurrent = String(p.cafe_id) === cafeId;
    return {
      serial,
      cafeId: String(p.cafe_id),
      cafeName: cafeRow?.name ? String(cafeRow.name) : 'Loyalty card',
      stampCount: Number(p.stamp_count) || 0,
      stampGoal: Number(cafeRow?.stamp_goal) || Number(cafe.stamp_goal) || 10,
      memberCode: p.member_code ? String(p.member_code) : null,
      isCurrentCafe: isCurrent,
      appleUrl: links.apple,
      googleUrl: links.google,
      useHereUrl: isCurrent ? walletSetupUrl(tapUrl, serial) : undefined,
    };
  });

  cards.sort((a, b) => Number(b.isCurrentCafe) - Number(a.isCurrentCafe));
  const primary = cards.find((c) => c.isCurrentCafe) ?? cards[0];

  // One card only → straight to Add to Wallet for that serial.
  if (cards.length === 1) {
    return redirectToWalletSetup(tapUrl, primary.serial, cafeId);
  }

  return html(
    restoreCardsPage(brand, email, cards, preferGoogle),
    primary.isCurrentCafe ? passCookie(cafeId, primary.serial) : undefined,
  );
}

async function viewPassStatus(
  cafe: Cafe,
  brand: CafeBrand,
  pass: Record<string, unknown>,
  serial: string,
): Promise<Response> {
  const cafeId = String(cafe.id);
  await ensureMemberCode(pass, cafeId);
  const cookie = passCookie(cafeId, serial);
  const count = Number(pass.stamp_count);
  const pending = pass.pending_milestone_reward
    ? String(pass.pending_milestone_reward)
    : null;

  if (pass.status === 'redeemed') {
    return html(redeemReadyPage(brand, serial, undefined, count), cookie);
  }

  if (pending) {
    return html(redeemReadyPage(brand, serial, pending, count), cookie);
  }

  const stampedToday = await hasStampedToday(String(pass.id));
  if (customerStampLimitsActive(cafe) && stampedToday) {
    return html(alreadyStampedPage(brand, count, serial), cookie);
  }

  return html(welcomePage(brand, count, serial), cookie);
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
  const cafeId = String(cafe.id);
  await ensureMemberCode(pass, cafeId);

  const cookie = passCookie(cafeId, serial);

  const ack = await maybeShowRedeemAck(pass, brand, String(cafe.id), serial);
  if (ack) return ack;

  if (pass.status === 'redeemed') {
    const restart = await applyRedeemRestartAndStamp(pass, cafe);
    if (!restart.ok) {
      return html(redeemReadyPage(brand, serial, undefined, Number(pass.stamp_count)), cookie);
    }

    return redirectToPassResult(
      tapUrl,
      serial,
      cafeId,
      'restarted',
      cookie,
      undefined,
      restart.stampCount ?? 1,
    );
  }

  const minSpend = minimumSpendAmount(cafe);
  if (minSpend != null) {
    return html(minimumSpendStaffPage(brand, minSpend), cookie);
  }

  const result = await applyStampToPass(cafe, pass);

  if (!result.ok) {
    if (result.error === 'redeem_pending') {
      return html(
        redeemReadyPage(brand, serial, result.milestoneReward ?? undefined, result.stampCount ?? Number(pass.stamp_count)),
        cookie,
      );
    }
    if (result.error === 'cooldown') {
      return redirectToPassResult(tapUrl, serial, cafeId, 'cooldown', cookie);
    }
    return html(stampErrorPage(brand));
  }

  if (result.rewardJustUnlocked || result.milestoneReward) {
    if (result.isRedeemed) {
      return redirectToPassResult(
        tapUrl,
        serial,
        cafeId,
        'reward',
        cookie,
        redeemSeenCookie(cafeId),
      );
    }
    return html(
      redeemReadyPage(brand, serial, result.milestoneReward ?? undefined, result.stampCount),
      cookie,
    );
  }

  return redirectToPassResult(
    tapUrl,
    serial,
    cafeId,
    'stamped',
    cookie,
    undefined,
    result.stampCount,
  );
}

async function joinFingerprint(req: Request, cafeId: string): Promise<string> {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const ua = (req.headers.get('user-agent') || '').slice(0, 160);
  const raw = `${cafeId}|${ip}|${ua}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 48);
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
  req: Request,
): Promise<Response> {
  const minSpend = minimumSpendAmount(cafe);
  if (minSpend != null) {
    return html(minimumSpendStaffPage(brand, minSpend));
  }

  if (shouldEnforceStarterLimit(String(cafe.plan), cafe.trial_ends_at as string | null)) {
    const count = await countUniqueMonthlyCustomers(cafeId);
    if (count >= STARTER_MONTHLY_CUSTOMER_LIMIT) {
      try {
        const upgrade = await upgradeStarterAtCustomerLimit(cafe);
        if (upgrade !== 'upgraded') {
          return html(capacityReachedPage(brand));
        }
        // Upgraded to Pro — allow this join to continue.
        cafe.plan = 'pro';
      } catch (err) {
        console.error('Starter auto-upgrade failed:', err);
        return html(capacityReachedPage(brand));
      }
    }
  }

  // Block stamp farming by clearing Safari site data and joining again from the same phone.
  const fingerprint = await joinFingerprint(req, cafeId);
  const { data: guard } = await supabase
    .from('pass_join_guards')
    .select('pass_serial, created_at')
    .eq('cafe_id', cafeId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (guard?.pass_serial) {
    const { data: existing } = await supabase
      .from('passes')
      .select('*')
      .eq('serial_number', guard.pass_serial)
      .eq('cafe_id', cafeId)
      .maybeSingle();
    if (existing) {
      const deletedFromWallet = !existing.wallet_added_at
        && !existing.push_token
        && !existing.device_id;
      const now = new Date().toISOString();

      // Deleted Wallet pass → new serial so Apple treats Add as a fresh card (not the stale one).
      if (deletedFromWallet) {
        const newSerial = crypto.randomUUID();
        const newAuth = crypto.randomUUID().replace(/-/g, '');
        const { error: reissueError } = await supabase.from('passes').update({
          serial_number: newSerial,
          auth_token: newAuth,
          updated_at: now,
          wallet_added_at: null,
          push_token: null,
          device_id: null,
        }).eq('id', existing.id);

        if (!reissueError) {
          await supabase.from('pass_join_guards').upsert({
            cafe_id: cafeId,
            fingerprint,
            pass_serial: newSerial,
            created_at: now,
          });
          return redirectToWalletSetup(tapUrl, newSerial, cafeId, true);
        }
      }

      await supabase.from('passes').update({ updated_at: now }).eq('id', existing.id);
      return redirectToWalletSetup(tapUrl, existing.serial_number, cafeId);
    }
  }

  const serial = crypto.randomUUID();
  const authToken = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  const memberCode = await generateUniqueMemberCode(cafeId);
  const stampsToAdd = isDoubleStampWindow(
    cafe.double_stamp_hours as Parameters<typeof isDoubleStampWindow>[0],
  ) ? 2 : 1;
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const stampCount = Math.min(stampsToAdd, stampGoal);
  const status = stampCount >= stampGoal ? 'redeemed' : 'active';

  const { data: newPass, error: passError } = await supabase
    .from('passes')
    .insert({
      cafe_id: cafeId,
      serial_number: serial,
      auth_token: authToken,
      member_code: memberCode,
      stamp_count: stampCount,
      status,
      last_stamp_at: now,
      updated_at: now,
      lifetime_stamps: stampCount,
    })
    .select()
    .single();

  if (passError || !newPass) {
    throw new Error(passError?.message ?? 'Failed to create pass');
  }

  await supabase.from('stamps').insert(
    Array.from({ length: stampsToAdd }, () => ({ pass_id: newPass.id, cafe_id: cafeId })),
  );
  await supabase.from('pass_join_guards').upsert({
    cafe_id: cafeId,
    fingerprint,
    pass_serial: serial,
    created_at: now,
  });

  if (cafe.collect_customer_details) {
    const joinUrl = `${tapUrl}?join=1&p=${encodeURIComponent(serial)}`;
    return new Response(null, {
      status: 303,
      headers: {
        Location: joinUrl,
        'Set-Cookie': newPassCookie(cafeId, serial),
      },
    });
  }

  return redirectToWalletSetup(tapUrl, serial, cafeId, true);
}
