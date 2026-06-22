import { secureStorage } from './storage';
import { DEFAULT_CARD_COLORS, DEFAULT_LOYALTY } from '@/constants/onboarding';

const KEY = 'tapstamp_onboarding_draft';

export interface OnboardingDraft {
  bizType: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoUri: string | null;
  chipCode: string | null;
  reward: string;
  stampGoal: number;
  minimumSpendEnabled: boolean;
  minimumSpend: number | null;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  bizType: 'cafe',
  ...DEFAULT_CARD_COLORS,
  logoUri: null,
  chipCode: null,
  ...DEFAULT_LOYALTY,
};

export async function loadOnboardingDraft(): Promise<OnboardingDraft> {
  try {
    const raw = await secureStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_DRAFT };
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & { passTemplate?: string };
    const { passTemplate: _removed, ...rest } = parsed;
    return { ...DEFAULT_DRAFT, ...rest };
  } catch {
    return { ...DEFAULT_DRAFT };
  }
}

export async function saveOnboardingDraft(patch: Partial<OnboardingDraft>): Promise<OnboardingDraft> {
  const merged = { ...(await loadOnboardingDraft()), ...patch };
  await secureStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export async function clearOnboardingDraft(): Promise<void> {
  await secureStorage.removeItem(KEY);
}
