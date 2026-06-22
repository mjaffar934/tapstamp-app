export type PlanId = 'starter' | 'pro' | 'multi';

export const HARDWARE_PRICE_GBP = 35;
export const STARTER_MONTHLY_CUSTOMER_LIMIT = 50;
export const TRIAL_DAYS = 14;

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
    tagline: 'Free after trial — up to 50 customers per month',
    features: [
      '1 loyalty stamp (£35)',
      '14-day free trial from go-live',
      'Free forever after trial',
      '50 unique customers per month',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 25,
    tagline: 'Unlimited customers — £25/mo after trial',
    features: [
      '1 loyalty stamp (£35)',
      '14-day free trial from go-live',
      'Unlimited loyalty cards',
      'Full analytics & campaigns',
    ],
  },
  multi: {
    id: 'multi',
    name: 'Multi-site',
    hardwareGbp: HARDWARE_PRICE_GBP,
    monthlyGbp: 59,
    tagline: 'Multiple locations — £59/mo after trial',
    features: [
      '1 loyalty stamp (£35)',
      '14-day free trial from go-live',
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
