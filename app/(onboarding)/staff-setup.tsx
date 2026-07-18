import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { clearOnboardingDraft } from '@/lib/onboardingDraft';
import { completeOnboarding, provisionDraftForStaff } from '@/lib/onboardingProvision';
import { colors, spacing } from '@/constants/theme';

export default function StaffSetupScreen() {
  const { business, refreshBusiness } = useAuth();
  const { cafe, refetch } = useOwnerCafe();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [staffCode, setStaffCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alert = useTapStampAlert();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const result = await provisionDraftForStaff(business?.name);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.staffCode) {
        setStaffCode(result.staffCode);
      }

      await refetch();
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [business?.name, refetch]);

  const displayCode = staffCode ?? cafe?.staff_code ?? null;

  const copyCode = async () => {
    if (!displayCode) return;
    await Clipboard.setStringAsync(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const continueNext = async () => {
    setFinishing(true);
    const result = await completeOnboarding({ businessName: business?.name });
    if (result.error) {
      setFinishing(false);
      alert('Could not finish setup', result.error);
      return;
    }
    await clearOnboardingDraft();
    await refreshBusiness();
    setFinishing(false);
    router.replace('/(onboarding)/done');
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={5}
        title="Staff mode"
        subtitle="Share this code with your team so they can stamp and redeem at the counter."
      />

      <Card style={styles.codeCard}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Text variant="caption" muted>STAFF CODE</Text>
            <Text variant="hero" style={styles.code}>
              {displayCode ?? '— — — — — —'}
            </Text>
            {error ? (
              <Text variant="caption" color={colors.error}>{error}</Text>
            ) : (
              <Text variant="bodySmall" muted style={styles.codeHint}>
                Staff enter this on the Staff screen on a shared device at the counter.
              </Text>
            )}
            {displayCode ? (
              <Button
                title={copied ? 'Copied' : 'Copy code'}
                variant="outline"
                onPress={copyCode}
              />
            ) : null}
          </>
        )}
      </Card>

      <Card style={styles.feature}>
        <View style={styles.featureRow}>
          <Ionicons name="radio-outline" size={22} color={colors.textSecondary} />
          <View style={styles.featureText}>
            <Text variant="bodySmall" style={styles.featureTitle}>Customer taps your stamp</Text>
            <Text variant="caption" muted>Stamps are collected automatically when customers tap on their phone.</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="people-outline" size={22} color={colors.textSecondary} />
          <View style={styles.featureText}>
            <Text variant="bodySmall" style={styles.featureTitle}>Manual stamp & redeem</Text>
            <Text variant="caption" muted>Staff can search by name when needed at the counter.</Text>
          </View>
        </View>
      </Card>

      <Button
        title="Finish setup"
        onPress={() => void continueNext()}
        disabled={loading}
        loading={finishing}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.xl,
  },
  code: {
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
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
