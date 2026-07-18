import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { loadOnboardingDraft } from '@/lib/onboardingDraft';
import { useAuth } from '@/contexts/AuthContext';
import { TAPSTAMP_BRAND } from '@/constants/tapstampBrand';
import { spacing } from '@/constants/theme';

export default function CardPreviewScreen() {
  const { business } = useAuth();
  const [draft, setDraft] = useState({
    logoUri: null as string | null,
    reward: 'Free coffee',
    stampGoal: 10,
    backgroundColor: TAPSTAMP_BRAND.backgroundColor,
    foregroundColor: TAPSTAMP_BRAND.foregroundColor,
    labelColor: TAPSTAMP_BRAND.labelColor,
    designMode: 'classic' as 'classic' | 'ai',
    programMode: 'stamps' as 'stamps' | 'stamps_levels',
    levels: [] as Array<{ stamp_count: number; reward: string }>,
  });

  useEffect(() => {
    loadOnboardingDraft().then((d) => {
      const levels = d.quiz.levels ?? [];
      const programMode = d.quiz.program_mode;
      const stampGoal =
        programMode === 'stamps_levels' && levels.length
          ? Math.max(...levels.map((l) => Number(l.stamp_count) || 0), d.quiz.stamp_goal || 10)
          : d.quiz.stamp_goal;
      setDraft({
        logoUri: d.logoUri,
        reward: d.quiz.reward,
        stampGoal,
        backgroundColor: d.backgroundColor,
        foregroundColor: d.foregroundColor,
        labelColor: d.labelColor,
        designMode: d.designMode,
        programMode,
        levels,
      });
    });
  }, []);

  const summary =
    draft.programMode === 'stamps_levels' && draft.levels.length
      ? draft.levels.map((l) => `${l.stamp_count} → ${l.reward}`).join(' · ')
      : `${draft.stampGoal} stamps → ${draft.reward}`;

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={4}
        title="Your loyalty card"
        subtitle="This is what customers add to Apple Wallet and Google Wallet."
      />

      <ExpandableWalletPreview
        title="Wallet preview"
        businessName={business?.name ?? 'Your business'}
        backgroundColor={draft.backgroundColor}
        foregroundColor={draft.foregroundColor}
        labelColor={draft.labelColor}
        logoUri={draft.logoUri}
        stampGoal={draft.stampGoal}
        stampsFilled={Math.min(2, draft.stampGoal)}
        reward={draft.reward}
        levels={draft.programMode === 'stamps_levels' ? draft.levels : undefined}
        showCustomerName
        customerName="Alex"
      />

      <Text variant="caption" muted style={styles.summary}>{summary}</Text>

      <View style={styles.cta}>
        <Button
          title="Continue"
          onPress={() => router.push('/(onboarding)/staff-setup')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { textAlign: 'center', marginTop: spacing.sm },
  cta: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
});
