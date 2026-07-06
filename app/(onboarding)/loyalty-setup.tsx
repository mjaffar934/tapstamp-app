import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { loadOnboardingDraft, saveOnboardingDraft } from '@/lib/onboardingDraft';
import { useAuth } from '@/contexts/AuthContext';
import { TAPSTAMP_BRAND } from '@/constants/tapstampBrand';
import { spacing } from '@/constants/theme';

export default function LoyaltySetupScreen() {
  const { business } = useAuth();
  const [reward, setReward] = useState('Free coffee');
  const [stampGoal, setStampGoal] = useState('10');
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingDraft().then((d) => {
      setReward(d.reward);
      setStampGoal(String(d.stampGoal));
      setLogoUri(d.logoUri);
    });
  }, []);

  const goalNum = parseInt(stampGoal, 10) || 10;

  const continueNext = async () => {
    await saveOnboardingDraft({
      reward: reward.trim() || 'Free coffee',
      stampGoal: goalNum > 0 ? goalNum : 10,
      minimumSpendEnabled: false,
      minimumSpend: null,
    });
    router.push('/(onboarding)/card-preview');
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={3}
        title="Rewards & stamps"
        subtitle="Set how customers earn their reward. You can change these anytime in settings."
      />

      <ExpandableWalletPreview
        businessName={business?.name ?? 'Your business'}
        backgroundColor={TAPSTAMP_BRAND.backgroundColor}
        foregroundColor={TAPSTAMP_BRAND.foregroundColor}
        labelColor={TAPSTAMP_BRAND.labelColor}
        logoUri={logoUri}
        stampGoal={goalNum}
        stampsFilled={Math.min(3, goalNum)}
        reward={reward.trim() || 'Free coffee'}
      />

      <Card style={styles.form}>
        <Input
          label="Reward name"
          value={reward}
          onChangeText={setReward}
          placeholder="Free oat latte"
        />
        <Input
          label="Stamps to earn reward"
          value={stampGoal}
          onChangeText={setStampGoal}
          keyboardType="number-pad"
          placeholder="10"
        />
        <Text variant="caption" muted>
          You can change stamp rules anytime in card settings.
        </Text>
      </Card>

      <Button title="Continue" onPress={continueNext} style={styles.cta} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginTop: spacing.lg },
  cta: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
