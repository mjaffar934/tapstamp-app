import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { clearOnboardingDraft } from '@/lib/onboardingDraft';

export async function restartOnboardingForDev(
  ownerId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('businesses')
    .update({
      onboarding_status: 'ordered',
    })
    .eq('owner_id', ownerId);

  if (error) return { error: error.message };

  // Allow quiz answers to be answered again after an intentional restart
  const { data: cafes } = await supabase
    .from('cafes')
    .select('id')
    .eq('owner_id', ownerId);

  const cafeIds = (cafes ?? []).map((c) => c.id as string);
  if (cafeIds.length) {
    await supabase.from('cafes').update({
      pass_design_quiz: null,
      pass_design_locked_at: null,
      pass_design_mode: 'classic',
      ai_background_color: null,
      ai_foreground_color: null,
      ai_label_color: null,
    } as never).in('id', cafeIds);
  }

  await clearOnboardingDraft();
  router.replace('/(onboarding)/welcome');
  return { error: null };
}
