export function levelNameFromReward(reward: string): string {
  const head = reward.split(/[·•\-–—|/]/)[0]?.trim() ?? reward.trim();
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
