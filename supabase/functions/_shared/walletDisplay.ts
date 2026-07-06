/** Shared copy + visuals for Apple / Google wallet passes. */

export function formatRewardDisplay(reward: string): string {
  const r = (reward || 'Free reward').trim();
  if (!r) return 'Free reward';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

/** Visual stamp row — matches Apple Wallet secondary field. */
export function buildStampDotsRow(
  stampCount: number,
  goal: number,
  isRedeemed: boolean,
): string {
  const filled = isRedeemed ? goal : stampCount;
  return Array.from({ length: goal }, (_, i) => (i < filled ? '●' : '○')).join('  ');
}
