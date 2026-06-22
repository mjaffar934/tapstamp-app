import { PLANS, HARDWARE_PRICE_GBP, STARTER_MONTHLY_CUSTOMER_LIMIT, TRIAL_DAYS, type PlanId } from '@/constants/plans';

export const ORDER_WEBSITE_URL =
  process.env.EXPO_PUBLIC_ORDER_WEBSITE_URL ?? '';

export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@tapstamp.com';

export function orderSignupUrl(plan: PlanId = 'starter'): string {
  const base = ORDER_WEBSITE_URL;
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/order?plan=${plan}`;
}

/** @deprecated Use orderSignupUrl(plan) */
export const ORDER_SIGNUP_URL = orderSignupUrl('starter');

export const BRAND = {
  eyebrow: 'Digital loyalty · No app needed',
  headline: 'The loyalty stamp your customers actually use',
  subhead:
    'A handcrafted loyalty stamp on your counter. Customers tap their phone. Their card appears in Apple Wallet instantly.',
  ownerAppNote: 'Use the email and password you created when you ordered your TapStamp stamp.',
  hardwarePrice: `£${HARDWARE_PRICE_GBP}`,
  trialDays: TRIAL_DAYS,
  starterLimit: STARTER_MONTHLY_CUSTOMER_LIMIT,
  plans: PLANS,
} as const;
