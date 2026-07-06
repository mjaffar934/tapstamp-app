import { loadOnboardingDraft } from '@/lib/onboardingDraft';
import { provisionCafe, uploadCafeLogo } from '@/lib/api';

export async function provisionFromDraft(options?: {
  completeSetup?: boolean;
  chipCode?: string;
  businessName?: string;
}): Promise<{ error?: string; cafeId?: string; staffCode?: string; trialStarted?: boolean }> {
  const draft = await loadOnboardingDraft();

  const result = await provisionCafe({
    name: options?.businessName,
    biz_type: draft.bizType,
    show_customer_name_on_pass: true,
    reward: draft.reward.trim() || 'Free coffee',
    stamp_goal: draft.stampGoal > 0 ? draft.stampGoal : 10,
    minimum_spend: null,
    ...(options?.chipCode ? { chip_code: options.chipCode } : {}),
    ...(options?.completeSetup && !options.chipCode ? { go_live: true } : {}),
  });

  if (result.error) return result;

  if (result.cafeId && draft.logoUri) {
    await uploadCafeLogo(result.cafeId, draft.logoUri).catch(() => undefined);
  }

  return result;
}

export async function provisionDraftForStaff(businessName?: string) {
  return provisionFromDraft({ businessName });
}

export async function completeOnboarding(options: {
  businessName?: string;
}) {
  return provisionFromDraft({
    businessName: options.businessName,
    completeSetup: true,
  });
}
