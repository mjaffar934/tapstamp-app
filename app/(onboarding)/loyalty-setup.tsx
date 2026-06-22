import { useEffect, useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
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
import { colors, spacing } from '@/constants/theme';

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function LoyaltySetupScreen() {
  const { business } = useAuth();
  const [reward, setReward] = useState('Free coffee');
  const [stampGoal, setStampGoal] = useState('10');
  const [minSpendEnabled, setMinSpendEnabled] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [draft, setDraft] = useState({
    backgroundColor: 'rgb(26, 24, 20)',
    foregroundColor: 'rgb(201, 169, 110)',
    labelColor: 'rgb(138, 128, 112)',
    logoUri: null as string | null,
  });

  useEffect(() => {
    loadOnboardingDraft().then((d) => {
      setReward(d.reward);
      setStampGoal(String(d.stampGoal));
      setMinSpendEnabled(d.minimumSpendEnabled);
      setAmountText(d.minimumSpend != null ? d.minimumSpend.toFixed(2) : '');
      setDraft({
        backgroundColor: d.backgroundColor,
        foregroundColor: d.foregroundColor,
        labelColor: d.labelColor,
        logoUri: d.logoUri,
      });
    });
  }, []);

  const goalNum = parseInt(stampGoal, 10) || 10;

  const continueNext = async () => {
    const amount = parseAmount(amountText);
    await saveOnboardingDraft({
      reward: reward.trim() || 'Free coffee',
      stampGoal: goalNum > 0 ? goalNum : 10,
      minimumSpendEnabled: minSpendEnabled,
      minimumSpend: minSpendEnabled && amount != null && amount > 0 ? amount : null,
    });
    router.push('/(onboarding)/card-preview');
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={4}
        title="Rewards & stamps"
        subtitle="Set how customers earn their reward. You can change these anytime in settings."
      />

      <ExpandableWalletPreview
        businessName={business?.name ?? 'Your business'}
        backgroundColor={draft.backgroundColor}
        foregroundColor={draft.foregroundColor}
        labelColor={draft.labelColor}
        logoUri={draft.logoUri}
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
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="h3">Minimum spend</Text>
            <Text variant="caption" muted>
              Staff confirm spend in barista mode before stamping
            </Text>
          </View>
          <Switch
            value={minSpendEnabled}
            onValueChange={setMinSpendEnabled}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={minSpendEnabled ? colors.accent : colors.surface}
          />
        </View>
        {minSpendEnabled ? (
          <Input
            label="Minimum amount (£)"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="8.50"
          />
        ) : null}
      </Card>

      <Button title="Continue" onPress={continueNext} style={styles.cta} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  cta: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
