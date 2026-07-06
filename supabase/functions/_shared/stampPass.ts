import { supabase } from './client.ts';
import { pushPassUpdate } from './apns.ts';
import { updateGoogleWalletObject } from './googleWallet.ts';
import { isDoubleStampWindow } from './utils.ts';

export interface StampResult {
  ok: boolean;
  error?: string;
  cooldownHoursLeft?: number;
  stampCount?: number;
  status?: string;
  isRedeemed?: boolean;
  rewardJustUnlocked?: boolean;
}

export async function applyStampToPass(
  cafe: Record<string, unknown>,
  pass: Record<string, unknown>,
): Promise<StampResult> {
  const serial = String(pass.serial_number);
  const cafeId = String(cafe.id);

  if (pass.last_stamp_at) {
    const hours = (Date.now() - new Date(String(pass.last_stamp_at)).getTime()) / 3600000;
    const cooldown = Number(cafe.stamp_cooldown_hours) || 4;
    if (hours < cooldown) {
      return { ok: false, error: 'cooldown', cooldownHoursLeft: Math.ceil(cooldown - hours) };
    }
  }

  if (pass.status === 'redeemed') {
    return { ok: false, error: 'redeem_pending' };
  }

  const stampsToAdd = isDoubleStampWindow(
    cafe.double_stamp_hours as Parameters<typeof isDoubleStampWindow>[0],
  ) ? 2 : 1;
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const newCount = Math.min(Number(pass.stamp_count) + stampsToAdd, stampGoal);
  const isRedeemed = newCount >= stampGoal;
  const newLifetime = (Number(pass.lifetime_stamps) || 0) + stampsToAdd;
  const unlockedTiers: string[] = [...((pass.unlocked_tiers as string[]) || [])];

  await supabase.from('stamps').insert(
    Array.from({ length: stampsToAdd }, () => ({ pass_id: pass.id, cafe_id: cafeId })),
  );

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
    stamp_count: isRedeemed ? stampGoal : newCount,
    status: isRedeemed ? 'redeemed' : 'active',
    last_stamp_at: new Date().toISOString(),
    lifetime_stamps: newLifetime,
    unlocked_tiers: unlockedTiers,
  }).eq('serial_number', serial);

  if (isRedeemed) {
    await supabase.from('redemptions').insert({ pass_id: pass.id, cafe_id: cafeId });
  }

  const updated = {
    ...pass,
    stamp_count: isRedeemed ? stampGoal : newCount,
    status: isRedeemed ? 'redeemed' : 'active',
  };
  await notifyPass(updated, cafe);

  return {
    ok: true,
    stampCount: isRedeemed ? stampGoal : newCount,
    status: isRedeemed ? 'redeemed' : 'active',
    isRedeemed,
    rewardJustUnlocked: isRedeemed,
  };
}

export async function applyRedeemToPass(
  pass: Record<string, unknown>,
  cafe: Record<string, unknown>,
): Promise<StampResult> {
  const serial = String(pass.serial_number);

  if (pass.status !== 'redeemed') {
    return { ok: false, error: 'not_ready' };
  }

  await supabase.from('passes').update({
    stamp_count: 0,
    status: 'active',
    last_stamp_at: null,
  }).eq('serial_number', serial);

  const updated = { ...pass, stamp_count: 0, status: 'active' };
  await notifyPass(updated, cafe);

  return { ok: true, stampCount: 0, status: 'active', isRedeemed: false };
}

async function notifyPass(
  pass: Record<string, unknown>,
  cafe: Record<string, unknown>,
): Promise<void> {
  await pushPassUpdate(pass.push_token as string | null);
  await updateGoogleWalletObject({
    cafe,
    serialNumber: String(pass.serial_number),
    stampCount: Number(pass.stamp_count),
    status: String(pass.status),
    customerName: pass.customer_name as string | null,
  }).catch((err) => console.error('Google Wallet sync:', err));
}
