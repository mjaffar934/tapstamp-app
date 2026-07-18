import { supabase } from './client.ts';
import { pushPassUpdate } from './apns.ts';
import { updateGoogleWalletObject } from './googleWallet.ts';
import { calendarDayKey, isDoubleStampWindow } from './utils.ts';

export interface StampResult {
  ok: boolean;
  error?: string;
  cooldownHoursLeft?: number;
  stampCount?: number;
  status?: string;
  isRedeemed?: boolean;
  rewardJustUnlocked?: boolean;
  /** Mid-level or final milestone reward just crossed this stamp. */
  milestoneReward?: string | null;
}

export interface StampOptions {
  /** Staff counter stamps bypass daily and hourly cooldown limits. */
  bypassDailyLimit?: boolean;
  /** Skip the short duplicate-stamp guard (e.g. redeem + stamp in one request). */
  skipDedupe?: boolean;
}

export interface RedeemOptions {
  /** Customer NFC auto-redeem skips the one-time "reward redeemed" ack page. */
  skipAck?: boolean;
  /** Skip push when redeem is immediately followed by a stamp in the same request. */
  skipNotify?: boolean;
}

/** Customer NFC taps always allow at most one stamp per calendar day.
 *  Hourly wait additionally applies when stamp_cooldown_hours > 0.
 *  Blank cooldown no longer means "stamp on every URL refresh". */
export function customerStampLimitsActive(
  cafe: Record<string, unknown>,
  options: StampOptions = {},
): boolean {
  if (options.bypassDailyLimit) return false;
  return true;
}

/** True if this pass already received a stamp today (UK calendar day). */
export async function hasStampedToday(
  passId: string,
  timeZone = 'Europe/London',
): Promise<boolean> {
  const { data: stamps } = await supabase
    .from('stamps')
    .select('created_at')
    .eq('pass_id', passId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (!stamps?.length) return false;

  const today = calendarDayKey(new Date(), timeZone);
  return stamps.some((row) => calendarDayKey(new Date(String(row.created_at)), timeZone) === today);
}

export async function applyStampToPass(
  cafe: Record<string, unknown>,
  pass: Record<string, unknown>,
  options: StampOptions = {},
): Promise<StampResult> {
  const serial = String(pass.serial_number);
  const cafeId = String(cafe.id);
  const passId = String(pass.id);
  const limitsActive = customerStampLimitsActive(cafe, options);

  if (pass.status === 'redeemed' || pass.pending_milestone_reward) {
    return {
      ok: false,
      error: 'redeem_pending',
      milestoneReward: pass.pending_milestone_reward
        ? String(pass.pending_milestone_reward)
        : String(cafe.reward || 'Free reward'),
      stampCount: Number(pass.stamp_count),
      status: String(pass.status),
    };
  }

  if (limitsActive && await hasStampedToday(passId)) {
    return { ok: false, error: 'cooldown' };
  }

  const cooldown = Number(cafe.stamp_cooldown_hours);
  if (limitsActive && Number.isFinite(cooldown) && cooldown > 0 && pass.last_stamp_at) {
    const hours = (Date.now() - new Date(String(pass.last_stamp_at)).getTime()) / 3600000;
    if (hours < cooldown) {
      return { ok: false, error: 'cooldown', cooldownHoursLeft: Math.ceil(cooldown - hours) };
    }
  }

  // Block duplicate stamps from double-tap, two tabs, or client redirect races.
  if (!options.bypassDailyLimit && !options.skipDedupe && pass.last_stamp_at) {
    const ms = Date.now() - new Date(String(pass.last_stamp_at)).getTime();
    if (ms < 5000) {
      const pending = pass.pending_milestone_reward
        ? String(pass.pending_milestone_reward)
        : null;
      const redeemed = pass.status === 'redeemed';
      return {
        ok: true,
        stampCount: Number(pass.stamp_count),
        status: String(pass.status),
        isRedeemed: redeemed,
        rewardJustUnlocked: Boolean(pending) || redeemed,
        milestoneReward: pending ?? (redeemed ? String(cafe.reward || 'Free reward') : null),
      };
    }
  }

  const { data: tiers } = await supabase
    .from('reward_tiers')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('stamp_count');

  let stampsToAdd = isDoubleStampWindow(
    cafe.double_stamp_hours as Parameters<typeof isDoubleStampWindow>[0],
  ) ? 2 : 1;
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const prevCount = Number(pass.stamp_count);

  // Stop exactly on the next milestone (don't skip past redeem with double stamps).
  const nextTier = (tiers ?? []).find((t) => Number(t.stamp_count) > prevCount);
  if (nextTier) {
    const maxAdd = Number(nextTier.stamp_count) - prevCount;
    stampsToAdd = Math.min(stampsToAdd, Math.max(1, maxAdd));
  }

  const newCount = Math.min(prevCount + stampsToAdd, stampGoal);
  const isFullCard = newCount >= stampGoal;
  const newLifetime = (Number(pass.lifetime_stamps) || 0) + stampsToAdd;
  const unlockedTiers: string[] = [...((pass.unlocked_tiers as string[]) || [])];
  const now = new Date().toISOString();

  await supabase.from('stamps').insert(
    Array.from({ length: stampsToAdd }, () => ({ pass_id: pass.id, cafe_id: cafeId })),
  );

  let milestoneReward: string | null = null;
  for (const tier of tiers ?? []) {
    const at = Number(tier.stamp_count);
    if (prevCount < at && newCount >= at) {
      milestoneReward = String(tier.reward);
    }
    if (newLifetime >= at && !unlockedTiers.includes(tier.id)) {
      unlockedTiers.push(tier.id);
    }
  }
  if (isFullCard && !milestoneReward) {
    milestoneReward = String(cafe.reward || 'Free reward');
  }

  // Mid milestones pause for redeem; final goal uses status=redeemed.
  const pendingReward = milestoneReward && !isFullCard ? milestoneReward : null;

  await supabase.from('passes').update({
    stamp_count: isFullCard ? stampGoal : newCount,
    status: isFullCard ? 'redeemed' : 'active',
    pending_milestone_reward: isFullCard ? null : pendingReward,
    last_stamp_at: now,
    updated_at: now,
    lifetime_stamps: newLifetime,
    unlocked_tiers: unlockedTiers,
    redeem_ack_pending: false,
  }).eq('serial_number', serial);

  const updated = {
    ...pass,
    stamp_count: isFullCard ? stampGoal : newCount,
    status: isFullCard ? 'redeemed' : 'active',
    pending_milestone_reward: pendingReward,
  };
  await notifyPass(serial, cafe, Number(updated.stamp_count), String(updated.status));

  return {
    ok: true,
    stampCount: isFullCard ? stampGoal : newCount,
    status: isFullCard ? 'redeemed' : 'active',
    isRedeemed: isFullCard,
    rewardJustUnlocked: Boolean(milestoneReward),
    milestoneReward,
  };
}

export async function applyRedeemToPass(
  pass: Record<string, unknown>,
  cafe: Record<string, unknown>,
  options: RedeemOptions = {},
): Promise<StampResult> {
  const serial = String(pass.serial_number);
  const cafeId = String(cafe.id);
  const pending = pass.pending_milestone_reward ? String(pass.pending_milestone_reward) : null;
  const isFullCard = pass.status === 'redeemed';

  if (!isFullCard && !pending) {
    return { ok: false, error: 'not_ready' };
  }

  const now = new Date().toISOString();

  if (isFullCard) {
    await supabase.from('passes').update({
      stamp_count: 0,
      status: 'active',
      pending_milestone_reward: null,
      last_stamp_at: now,
      updated_at: now,
      redeem_ack_pending: options.skipAck ? false : true,
    }).eq('serial_number', serial);

    await supabase.from('redemptions').insert({ pass_id: pass.id, cafe_id: cafeId });

    if (!options.skipNotify) {
      await notifyPass(serial, cafe, 0, 'active');
    }

    return { ok: true, stampCount: 0, status: 'active', isRedeemed: false };
  }

  // Mid milestone: claim reward, keep stamp progress, unlock next taps.
  const keepCount = Number(pass.stamp_count);
  await supabase.from('passes').update({
    pending_milestone_reward: null,
    status: 'active',
    updated_at: now,
    redeem_ack_pending: options.skipAck ? false : true,
  }).eq('serial_number', serial);

  await supabase.from('redemptions').insert({ pass_id: pass.id, cafe_id: cafeId });

  if (!options.skipNotify) {
    await notifyPass(serial, cafe, keepCount, 'active');
  }

  return {
    ok: true,
    stampCount: keepCount,
    status: 'active',
    isRedeemed: false,
    milestoneReward: pending,
  };
}

/** Redeem a full card and add the first stamp of the new cycle in one step. */
export async function applyRedeemRestartAndStamp(
  pass: Record<string, unknown>,
  cafe: Record<string, unknown>,
  options: StampOptions = {},
): Promise<StampResult> {
  const serial = String(pass.serial_number);
  const cafeId = String(cafe.id);
  const passId = String(pass.id);

  if (pass.status !== 'redeemed') {
    return { ok: false, error: 'not_ready' };
  }

  // Same visit limits as normal stamps — prevents farming a full card via refresh.
  const limitsActive = customerStampLimitsActive(cafe, options);
  if (limitsActive && await hasStampedToday(passId)) {
    return { ok: false, error: 'cooldown' };
  }

  const stampGoal = Number(cafe.stamp_goal) || 10;
  const stampsToAdd = isDoubleStampWindow(
    cafe.double_stamp_hours as Parameters<typeof isDoubleStampWindow>[0],
  ) ? 2 : 1;
  const newCount = Math.min(stampsToAdd, stampGoal);
  const newLifetime = (Number(pass.lifetime_stamps) || 0) + stampsToAdd;
  const now = new Date().toISOString();

  await supabase.from('redemptions').insert({ pass_id: pass.id, cafe_id: cafeId });
  await supabase.from('stamps').insert(
    Array.from({ length: stampsToAdd }, () => ({ pass_id: pass.id, cafe_id: cafeId })),
  );

  const unlockedTiers: string[] = [...((pass.unlocked_tiers as string[]) || [])];
  const { data: tiers } = await supabase
    .from('reward_tiers')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('stamp_count');

  for (const tier of tiers ?? []) {
    if (newLifetime >= tier.stamp_count && !unlockedTiers.includes(tier.id)) {
      unlockedTiers.push(tier.id);
    }
  }

  await supabase.from('passes').update({
    stamp_count: newCount,
    status: 'active',
    last_stamp_at: now,
    updated_at: now,
    lifetime_stamps: newLifetime,
    unlocked_tiers: unlockedTiers,
    pending_milestone_reward: null,
    redeem_ack_pending: false,
  }).eq('serial_number', serial);

  await notifyPass(serial, cafe, newCount, 'active');

  return {
    ok: true,
    stampCount: newCount,
    status: 'active',
    isRedeemed: false,
    rewardJustUnlocked: false,
  };
}

async function notifyPass(
  serial: string,
  cafe: Record<string, unknown>,
  stampCount: number,
  status: string,
): Promise<void> {
  const { data: freshPass } = await supabase
    .from('passes')
    .select('push_token, customer_name, lifetime_stamps, cafe_id, pending_milestone_reward')
    .eq('serial_number', serial)
    .maybeSingle();

  const cafeId = String(freshPass?.cafe_id ?? cafe.id ?? '');
  const { data: tiers } = cafeId
    ? await supabase
      .from('reward_tiers')
      .select('stamp_count, reward')
      .eq('cafe_id', cafeId)
      .order('stamp_count')
    : { data: [] as Array<{ stamp_count: number; reward: string }> };

  await pushPassUpdate(freshPass?.push_token as string | null | undefined);
  await updateGoogleWalletObject({
    cafe,
    serialNumber: serial,
    stampCount,
    status,
    customerName: (freshPass?.customer_name as string | null) ?? null,
    lifetimeStamps: Number(freshPass?.lifetime_stamps) || stampCount,
    tiers: tiers ?? [],
    pendingMilestoneReward: (freshPass?.pending_milestone_reward as string | null) ?? null,
  }).catch((err) => console.error('Google Wallet sync:', err));
}
