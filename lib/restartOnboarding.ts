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

  await clearOnboardingDraft();
  router.replace('/(onboarding)/welcome');
  return { error: null };
}
