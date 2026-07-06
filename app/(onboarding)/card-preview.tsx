import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
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
  });

  useEffect(() => {
    loadOnboardingDraft().then((d) => {
      setDraft({
        logoUri: d.logoUri,
        reward: d.reward,
        stampGoal: d.stampGoal,
      });
    });
  }, []);

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={4}
        title="Your loyalty card"
        subtitle="Review how it appears on iPhone and Android before you go live."
      />

      <ExpandableWalletPreview
        title="Wallet preview"
        businessName={business?.name ?? 'Your business'}
        backgroundColor={TAPSTAMP_BRAND.backgroundColor}
        foregroundColor={TAPSTAMP_BRAND.foregroundColor}
        labelColor={TAPSTAMP_BRAND.labelColor}
        logoUri={draft.logoUri}
        stampGoal={draft.stampGoal}
        stampsFilled={Math.min(3, draft.stampGoal)}
        reward={draft.reward}
      />

      <View style={styles.cta}>
        <Button
          title="Set up staff mode"
          onPress={() => router.push('/(onboarding)/staff-setup')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
