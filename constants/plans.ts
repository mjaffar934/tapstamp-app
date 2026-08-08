export type PlanId = 'starter' | 'pro' | 'multi';

export const HARDWARE_PRICE_GBP = 0;
export const STARTER_MONTHLY_CUSTOMER_LIMIT = 50;
/** @deprecated No timed trial — billing starts at 50 unique customers/month on Starter */
export const TRIAL_DAYS = 0;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  hardwareGbp: number;
  monthlyGbp: number | null;
  tagline: string;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: null,
    tagline: 'Free up to 50 customers/month — then £25/mo',
    features: [
      'Free loyalty stamp included',
      'Free up to 50 unique customers per month',
      'Add a card — auto-upgrade to £25/mo at 50',
      'Counter resets each calendar month',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 25,
    tagline: '£25/mo after 50 unique customers/month',
    features: [
      'Free loyalty stamp included',
      'Unlimited customers per month',
      'Starts when you hit 50 (card on file)',
      'Full analytics & campaigns',
    ],
  },
  multi: {
    id: 'multi',
    name: 'Multi-site',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 59,
    tagline: 'Legacy multi-site plan',
    features: [
      'Free loyalty stamp included',
      'Up to 5 locations',
      'Combined dashboard',
    ],
  },
};

export const PLAN_IDS: PlanId[] = ['starter', 'pro', 'multi'];

export function parsePlanId(value: string | null | undefined): PlanId {
  if (value === 'pro' || value === 'multi') return value;
  return 'starter';
}

export function planLabel(plan: string | null | undefined): string {
  const id = parsePlanId(plan ?? undefined);
  return PLANS[id].name;
}
