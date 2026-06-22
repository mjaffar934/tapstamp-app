import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { colors, spacing } from '@/constants/theme';

export default function StaffSetupScreen() {
  const { cafe } = useOwnerCafe();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!cafe?.staff_code) return;
    await Clipboard.setStringAsync(cafe.staff_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const continueNext = () => {
    if (!cafe?.staff_code) {
      Alert.alert(
        'Staff code loading',
        'Your staff code will appear in Settings once your cafe is linked.',
      );
    }
    router.push('/(onboarding)/chip-link');
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={6}
        title="Barista & staff mode"
        subtitle="Give your team a quick way to stamp and redeem at the counter — no owner login needed."
      />

      <Card style={styles.codeCard}>
        <Ionicons name="key-outline" size={28} color={colors.accent} />
        <Text variant="caption" muted>STAFF CODE</Text>
        <Text variant="hero" style={styles.code}>
          {cafe?.staff_code ?? '······'}
        </Text>
        <Text variant="bodySmall" muted style={styles.codeHint}>
          Baristas enter this code on the Staff screen to open barista mode on a shared iPad or phone.
        </Text>
        {cafe?.staff_code ? (
          <Button
            title={copied ? 'Copied!' : 'Copy staff code'}
            variant="outline"
            onPress={copyCode}
          />
        ) : null}
      </Card>

      <Card style={styles.feature}>
        <View style={styles.featureRow}>
          <Ionicons name="scan-outline" size={22} color={colors.accentDark} />
          <View style={styles.featureText}>
            <Text variant="bodySmall" style={styles.featureTitle}>Scan wallet QR</Text>
            <Text variant="caption" muted>Customers show their pass — staff scan and stamp in seconds.</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="people-outline" size={22} color={colors.accentDark} />
          <View style={styles.featureText}>
            <Text variant="bodySmall" style={styles.featureTitle}>Pick from recent passes</Text>
            <Text variant="caption" muted>Search by name if the customer forgot their wallet.</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.accentDark} />
          <View style={styles.featureText}>
            <Text variant="bodySmall" style={styles.featureTitle}>Minimum spend verified</Text>
            <Text variant="caption" muted>Staff confirm spend at the till before stamping.</Text>
          </View>
        </View>
      </Card>

      <Button title="Continue to link stamp" onPress={continueNext} style={styles.cta} />
      <Button title="Set up staff later" variant="ghost" onPress={continueNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentMuted,
    marginBottom: spacing.md,
  },
  code: {
    letterSpacing: 6,
    color: colors.accentDark,
  },
  codeHint: {
    textAlign: 'center',
    maxWidth: 300,
  },
  feature: { gap: spacing.md, marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontWeight: '600' },
  cta: { marginBottom: spacing.sm },
});
