import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { OwnerFlowSteps } from '@/components/auth/OwnerFlowSteps';
import { colors, spacing } from '@/constants/theme';

const SETUP_STEPS = [
  { icon: 'storefront-outline' as const, label: 'Business type' },
  { icon: 'image-outline' as const, label: 'Logo' },
  { icon: 'gift-outline' as const, label: 'Rewards & stamps' },
  { icon: 'card-outline' as const, label: 'Preview your card' },
  { icon: 'people-outline' as const, label: 'Staff mode' },
];

export default function WelcomeScreen() {
  const { signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={() => void signOut()} hitSlop={12}>
          <Text variant="bodySmall" color={colors.textSecondary}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <OwnerFlowSteps current="setup" />
        <Text variant="caption" muted style={styles.eyebrow}>Step 3 · Your card</Text>
        <Text variant="hero" style={styles.title}>Set up your loyalty card</Text>
        <Text muted style={styles.subtitle}>
          Your TapStamp is linked. Set up your loyalty card — about two minutes.
        </Text>
      </View>

      <Card style={styles.list} padded={false}>
        {SETUP_STEPS.map((step, i) => (
          <View key={step.label} style={[styles.row, i === 0 && styles.rowFirst]}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={18} color={colors.textSecondary} />
            </View>
            <Text variant="bodySmall">{step.label}</Text>
          </View>
        ))}
      </Card>

      <Button title="Begin setup" onPress={() => router.push('/(onboarding)/biz-type')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
  },
  hero: { paddingTop: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  title: { letterSpacing: -0.5 },
  subtitle: { maxWidth: 320, lineHeight: 24 },
  list: {
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
