import { View, StyleSheet, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { useAuth } from '@/contexts/AuthContext';
import { resumeCheckout } from '@/lib/api';
import { SUPPORT_EMAIL } from '@/constants/config';
import { PLANS, HARDWARE_PRICE_GBP } from '@/constants/plans';
import { colors, spacing } from '@/constants/theme';
import { useState } from 'react';
import type { PlanId } from '@/constants/plans';

export default function PaymentPendingScreen() {
  const { business, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const planId = (business?.plan_selected ?? 'starter') as PlanId;
  const plan = PLANS[planId];

  const completePayment = async () => {
    setLoading(true);
    const result = await resumeCheckout();
    setLoading(false);

    if (result.error || !result.checkoutUrl) {
      Alert.alert('Could not open checkout', result.error ?? `Try again or contact ${SUPPORT_EMAIL}`);
      return;
    }

    await Linking.openURL(result.checkoutUrl);
  };

  return (
    <Screen>
      <BackHeader
        onBack={async () => {
          await signOut();
          router.replace('/(auth)/gate');
        }}
      />
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="card-outline" size={40} color={colors.accent} />
        </View>
        <Text variant="caption" color={colors.accentDark} style={styles.eyebrow}>
          PAYMENT REQUIRED
        </Text>
        <Text variant="hero">Complete your order</Text>
        <Text muted style={styles.subtitle}>
          Your account is ready. Pay £{HARDWARE_PRICE_GBP} for your loyalty stamp — then sign in here to track delivery and set up when it arrives.
        </Text>
      </View>

      <Card style={styles.card}>
        <Text variant="caption" muted>YOUR PLAN</Text>
        <Text variant="h3">{plan.name}</Text>
        <Text variant="bodySmall" muted>
          Due today · £{HARDWARE_PRICE_GBP} for your stamp
        </Text>
      </Card>

      <Button title="Pay with Stripe" onPress={completePayment} loading={loading} />
      <Text variant="caption" muted style={styles.hint}>
        After payment, your stamp ships within 48 hours. Sign in again to track delivery.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: { letterSpacing: 1 },
  subtitle: { textAlign: 'center', maxWidth: 320, lineHeight: 24 },
  card: { gap: spacing.xs, marginBottom: spacing.xl },
  hint: { textAlign: 'center', marginTop: spacing.md },
});
