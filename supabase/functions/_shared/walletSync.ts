import { supabase } from './client.ts';
import { notifyPass } from './stampPass.ts';

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

  const { data: passes } = await supabase
    .from('passes')
    .select(
      'serial_number, stamp_count, status, customer_name, member_code, lifetime_stamps, pending_milestone_reward, push_token',
    )
    .eq('cafe_id', cafeId)
    .order('updated_at', { ascending: false })
    .limit(150);

  for (const pass of passes ?? []) {
    const serial = String(pass.serial_number);
    try {
      const ok = await notifyPass(
        serial,
        cafe,
        Number(pass.stamp_count) || 0,
        String(pass.status || 'active'),
      );
      if (!ok) {
        console.error('Wallet sync failed for', serial);
      }
    } catch (err) {
      console.error('Wallet sync failed for', serial, err);
      await supabase.from('passes').update({
        last_wallet_sync_at: new Date().toISOString(),
        last_wallet_sync_ok: false,
        last_wallet_sync_error: 'wallet_sync_exception',
      }).eq('serial_number', serial);
    }
  }
}
