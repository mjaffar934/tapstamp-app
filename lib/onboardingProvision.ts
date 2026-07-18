import { loadOnboardingDraft } from '@/lib/onboardingDraft';
import { provisionCafe, uploadCafeLogo } from '@/lib/api';

export async function provisionFromDraft(options?: {
  completeSetup?: boolean;
  chipCode?: string;
  businessName?: string;
}): Promise<{ error?: string; cafeId?: string; staffCode?: string; trialStarted?: boolean }> {
  const draft = await loadOnboardingDraft();
  const quiz = draft.quiz;
  const levels = Array.isArray(quiz?.levels) ? quiz.levels : [];
  const programMode = quiz?.program_mode ?? draft.programMode;
  const mainReward =
    programMode === 'stamps_levels' && levels.length
      ? levels[levels.length - 1]?.reward || draft.reward
      : (quiz?.reward || draft.reward).trim() || 'Free coffee';
  const mainGoal =
    programMode === 'stamps_levels' && levels.length
      ? Math.max(...levels.map((l) => Number(l.stamp_count) || 0), 10)
      : (quiz?.stamp_goal || draft.stampGoal) > 0
        ? (quiz?.stamp_goal || draft.stampGoal)
        : 10;

  const result = await provisionCafe({
    name: options?.businessName,
    biz_type: draft.bizType,
    show_customer_name_on_pass: true,
    reward: mainReward,
    stamp_goal: mainGoal,
    minimum_spend: null,
    pass_template: 'classic',
    background_color: draft.backgroundColor,
    foreground_color: draft.foregroundColor,
    label_color: draft.labelColor,
    ...(options?.chipCode ? { chip_code: options.chipCode } : {}),
    ...(options?.completeSetup && !options.chipCode ? { go_live: true } : {}),
  });

  if (result.error) return result;

  if (result.cafeId && draft.logoUri) {
    await uploadCafeLogo(result.cafeId, draft.logoUri).catch(() => undefined);
  }

  if (result.cafeId && programMode === 'stamps_levels' && levels.length > 0) {
    const { supabase } = await import('./supabase');
    await supabase.from('reward_tiers').delete().eq('cafe_id', result.cafeId);
    await supabase.from('reward_tiers').insert(
      levels.map((l) => ({
        cafe_id: result.cafeId,
        stamp_count: l.stamp_count,
        reward: l.reward,
      })) as never,
    );
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
