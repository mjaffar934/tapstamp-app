/** Client helpers mirrored from edge walletDisplay for previews. */

export function formatRewardDisplay(reward: string): string {
  const r = (reward || 'Free reward').trim();
  if (!r) return 'Free reward';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export interface RewardTierLike {
  stamp_count: number;
  reward: string;
}

export function formatLevelsLine(tiers: RewardTierLike[], maxLen = 42): string {
  const sorted = [...tiers].sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count));
  if (!sorted.length) return '';
  const parts = sorted.map((t) => {
    const short = formatRewardDisplay(String(t.reward)).replace(/^Free\s+/i, '').slice(0, 12);
    return `${t.stamp_count}=${short}`;
  });
  let line = parts.join(' · ');
  if (line.length <= maxLen) return line;
  line = parts.join('·');
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}

export function formatUpcomingMilestonesLine(
  stampCount: number,
  tiers: RewardTierLike[],
  maxLen = 42,
): string | null {
  const upcoming = [...tiers]
    .sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count))
    .filter((t) => Number(t.stamp_count) > stampCount);
  if (!upcoming.length) return null;
  return formatLevelsLine(upcoming, maxLen);
}

export function nextMilestone(
  stampCount: number,
  tiers: RewardTierLike[],
): { stamp_count: number; reward: string } | null {
  const sorted = [...tiers].sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count));
  return sorted.find((t) => Number(t.stamp_count) > stampCount) ?? null;
}

export function milestoneAtCount(
  stampCount: number,
  tiers: RewardTierLike[] | null | undefined,
): { stamp_count: number; reward: string } | null {
  const sorted = [...(tiers ?? [])].sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count));
  const hit = sorted.find((t) => Number(t.stamp_count) === stampCount);
  return hit ? { stamp_count: Number(hit.stamp_count), reward: String(hit.reward) } : null;
}

export function nextTierReward(
  stampCount: number,
  tiers: RewardTierLike[],
  fallbackReward: string,
): string {
  const next = nextMilestone(stampCount, tiers);
  if (next) return formatRewardDisplay(String(next.reward));
  const sorted = [...tiers].sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count));
  if (sorted.length) return formatRewardDisplay(String(sorted[sorted.length - 1].reward));
  return formatRewardDisplay(fallbackReward);
}

/** e.g. "5 · Free pastry" — clear next milestone for levels programmes. */
export function formatNextMilestoneValue(
  stampCount: number,
  tiers: RewardTierLike[],
  fallbackReward: string,
): string {
  const next = nextMilestone(stampCount, tiers);
  if (next) {
    return `${next.stamp_count} · ${formatRewardDisplay(String(next.reward))}`;
  }
  return formatRewardDisplay(fallbackReward);
}

export function stripSegmentProgress(
  stampCount: number,
  stampGoal: number,
  tiers: RewardTierLike[] | null | undefined,
  opts?: { complete?: boolean; redeemed?: boolean },
): { filled: number; total: number; hideDots?: boolean } {
  const sorted = [...(tiers ?? [])].sort((a, b) => Number(a.stamp_count) - Number(b.stamp_count));

  if (opts?.redeemed || opts?.complete) {
    if (sorted.length >= 2) {
      const on = sorted.find((t) => Number(t.stamp_count) === stampCount)
        ?? sorted[sorted.length - 1];
      const idx = sorted.indexOf(on);
      const start = idx > 0 ? Number(sorted[idx - 1].stamp_count) : 0;
      const end = Number(on.stamp_count);
      const total = Math.max(1, end - start);
      return { filled: total, total };
    }
    return { filled: stampGoal, total: Math.max(1, stampGoal) };
  }

  if (sorted.length < 2) {
    return { filled: Math.min(stampCount, stampGoal), total: Math.max(1, stampGoal) };
  }

  const onMilestone = sorted.find((t) => Number(t.stamp_count) === stampCount);
  if (onMilestone) {
    const next = sorted.find((t) => Number(t.stamp_count) > stampCount);
    if (next) {
      const start = Number(onMilestone.stamp_count);
      const end = Number(next.stamp_count);
      return { filled: 0, total: Math.max(1, end - start) };
    }
    const idx = sorted.indexOf(onMilestone);
    const start = idx > 0 ? Number(sorted[idx - 1].stamp_count) : 0;
    const end = Number(onMilestone.stamp_count);
    return { filled: Math.max(1, end - start), total: Math.max(1, end - start) };
  }

  const next = sorted.find((t) => Number(t.stamp_count) > stampCount);
  const prev = [...sorted].reverse().find((t) => Number(t.stamp_count) <= stampCount);
  const start = prev ? Number(prev.stamp_count) : 0;
  const end = next ? Number(next.stamp_count) : stampGoal;
  const total = Math.max(1, end - start);
  const filled = Math.max(0, Math.min(total, stampCount - start));
  return { filled, total };
}

export function buildRewardFieldCopy(input: {
  stampCount: number;
  stampGoal: number;
  status: string;
  mainReward: string;
  lifetimeStamps?: number | null;
  tiers?: RewardTierLike[] | null;
  pendingMilestoneReward?: string | null;
}): { label: string; value: string; levelsLine: string | null; upcomingLine: string | null } {
  const isRedeemed = input.status === 'redeemed';
  const reward = formatRewardDisplay(input.mainReward);
  const tiers = [...(input.tiers ?? [])].sort(
    (a, b) => Number(a.stamp_count) - Number(b.stamp_count),
  );
  const hasLevels = tiers.length >= 2;
  const levelsLine = hasLevels ? formatLevelsLine(tiers) : null;
  const upcomingLine = hasLevels ? formatUpcomingMilestonesLine(input.stampCount, tiers) : null;
  const lifetime = Number(input.lifetimeStamps) || input.stampCount;
  const completedCycle = lifetime > input.stampCount;
  const pending = input.pendingMilestoneReward?.trim() || null;

  if (isRedeemed) {
    return { label: 'REDEEM', value: reward, levelsLine, upcomingLine: null };
  }

  if (pending) {
    return {
      label: 'REDEEM',
      value: formatRewardDisplay(pending),
      levelsLine,
      upcomingLine,
    };
  }

  if (hasLevels) {
    return {
      label: 'NEXT REWARD',
      value: formatNextMilestoneValue(input.stampCount, tiers, reward),
      levelsLine,
      upcomingLine,
    };
  }

  if (input.stampCount >= input.stampGoal) {
    return { label: 'REDEEM', value: reward, levelsLine: null, upcomingLine: null };
  }

  return {
    label: completedCycle ? 'NEXT REWARD' : 'REWARD',
    value: reward,
    levelsLine: null,
    upcomingLine: null,
  };
}
