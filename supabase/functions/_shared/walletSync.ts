import { supabase } from './client.ts';
import { pushPassUpdate } from './apns.ts';
import { updateGoogleWalletObject } from './googleWallet.ts';
import { ensureMemberCode } from './memberCode.ts';

/**
 * Push Apple + Google Wallet updates for recent cafe passes after settings change
 * (reward, stamp goal, show name, etc.).
 */
export async function syncCafeWalletPasses(cafeId: string): Promise<void> {
  const { data: cafe } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', cafeId)
    .maybeSingle();

  if (!cafe) return;

  const [{ data: tiers }, { data: passes }] = await Promise.all([
    supabase
      .from('reward_tiers')
      .select('stamp_count, reward')
      .eq('cafe_id', cafeId)
      .order('stamp_count'),
    supabase
      .from('passes')
      .select(
        'serial_number, stamp_count, status, customer_name, member_code, lifetime_stamps, pending_milestone_reward, push_token',
      )
      .eq('cafe_id', cafeId)
      .order('updated_at', { ascending: false })
      .limit(150),
  ]);

  for (const pass of passes ?? []) {
    const serial = String(pass.serial_number);
    try {
      const memberCode = await ensureMemberCode(pass as Record<string, unknown>, cafeId);
      await Promise.all([
        pushPassUpdate(pass.push_token as string | null | undefined, serial),
        updateGoogleWalletObject({
          cafe,
          serialNumber: serial,
          stampCount: Number(pass.stamp_count) || 0,
          status: String(pass.status || 'active'),
          customerName: (pass.customer_name as string | null) ?? null,
          memberCode,
          lifetimeStamps: Number(pass.lifetime_stamps) || Number(pass.stamp_count) || 0,
          tiers: tiers ?? [],
          pendingMilestoneReward: (pass.pending_milestone_reward as string | null) ?? null,
        }),
      ]);
    } catch (err) {
      console.error('Wallet sync failed for', serial, err);
    }
  }
}
