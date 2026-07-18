/** Default lifetime membership ladder (stamps never reset on redeem). */
export const DEFAULT_MEMBERSHIP_LEVELS = [
  { stamp_count: 25, reward: 'Bronze · Free pastry' },
  { stamp_count: 50, reward: 'Silver · Free drink + pastry' },
  { stamp_count: 100, reward: 'Gold · VIP reward' },
] as const;

export function levelNameFromReward(reward: string): string {
  const head = reward.split(/[·•\-–—]/)[0]?.trim() ?? reward.trim();
  return head || reward.trim();
}

export function currentMembershipLevel(
  lifetimeStamps: number,
  tiers: Array<{ stamp_count: number; reward: string }>,
): { name: string; stamp_count: number; reward: string } | null {
  const sorted = [...tiers].sort((a, b) => a.stamp_count - b.stamp_count);
  let current: { name: string; stamp_count: number; reward: string } | null = null;
  for (const tier of sorted) {
    if (lifetimeStamps >= tier.stamp_count) {
      current = {
        name: levelNameFromReward(tier.reward),
        stamp_count: tier.stamp_count,
        reward: tier.reward,
      };
    }
  }
  return current;
}

export function nextMembershipLevel(
  lifetimeStamps: number,
  tiers: Array<{ stamp_count: number; reward: string }>,
): { name: string; stamp_count: number; remaining: number; reward: string } | null {
  const sorted = [...tiers].sort((a, b) => a.stamp_count - b.stamp_count);
  const next = sorted.find((t) => t.stamp_count > lifetimeStamps);
  if (!next) return null;
  return {
    name: levelNameFromReward(next.reward),
    stamp_count: next.stamp_count,
    remaining: next.stamp_count - lifetimeStamps,
    reward: next.reward,
  };
}
