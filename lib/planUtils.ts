import { PLANS, STARTER_MONTHLY_CUSTOMER_LIMIT, TRIAL_DAYS, parsePlanId, type PlanId } from '@/constants/plans';

export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

export function trialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function trialEnded(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) <= new Date();
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === 'pro' || plan === 'multi';
}

export function isStarterPlan(plan: string | null | undefined): boolean {
  return plan === 'starter' || plan === 'trial';
}

export function shouldEnforceStarterLimit(
  plan: string | null | undefined,
  trialEndsAt: string | null | undefined,
): boolean {
  if (!isStarterPlan(plan)) return false;
  return trialEnded(trialEndsAt);
}

export function shouldSuspendCafe(cafe: {
  status?: string;
  plan?: string;
  trial_ends_at?: string | null;
  subscription_status?: string;
}): boolean {
  if (cafe.status === 'suspended') return true;
  if (isTrialActive(cafe.trial_ends_at)) return false;
  if (cafe.subscription_status === 'trialing') return false;
  if (!cafe.trial_ends_at) return false;
  if (isStarterPlan(cafe.plan)) return false;
  if (isPaidPlan(cafe.plan)) {
    return cafe.subscription_status !== 'active';
  }
  return false;
}

export function planLabel(plan: string | null | undefined): string {
  const id = parsePlanId(plan ?? undefined);
  return PLANS[id].name;
}

export function monthlyPriceLabel(planId: PlanId): string {
  const plan = PLANS[planId];
  if (plan.monthlyGbp == null) return 'Free after trial';
  return `£${plan.monthlyGbp}/mo after trial`;
}

export { STARTER_MONTHLY_CUSTOMER_LIMIT, TRIAL_DAYS };
