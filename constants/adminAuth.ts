import { PLANS, type PlanId } from '@/constants/plans';

const ADMIN_EMAILS_RAW = process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? process.env.EXPO_PUBLIC_DEV_EMAIL ?? '';
const ADMIN_SECRET_RAW =
  process.env.EXPO_PUBLIC_ADMIN_SECRET ?? process.env.EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET ?? '';

export const ADMIN_EMAILS = ADMIN_EMAILS_RAW.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
export const ADMIN_SECRET = ADMIN_SECRET_RAW.trim();

export function isAdminUser(email: string | undefined | null): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export const ADMIN_PLAN_OPTIONS: PlanId[] = ['starter', 'pro', 'multi'];

export function planLabel(id: PlanId): string {
  return PLANS[id].name;
}
