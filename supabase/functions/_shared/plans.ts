export type PlanId = 'starter' | 'pro' | 'multi';

export const HARDWARE_PRICE_GBP = 0;
export const STARTER_MONTHLY_CUSTOMER_LIMIT = 50;
export const TRIAL_DAYS = 14;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  hardwareGbp: number;
  monthlyGbp: number | null;
  tagline: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: null,
    tagline: 'Free after trial — 50 unique customers/month',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 25,
    tagline: 'Unlimited customers — £25/mo after trial',
  },
  multi: {
    id: 'multi',
    name: 'Multi-site',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 59,
    tagline: 'Multiple locations — £59/mo after trial',
  },
};

export function parsePlanId(value: string | null | undefined): PlanId {
  if (value === 'pro' || value === 'multi') return value;
  return 'starter';
}

export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
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
