import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { colors, spacing } from '@/constants/theme';

const SETUP_STEPS = [
  { icon: 'storefront-outline' as const, label: 'Business type' },
  { icon: 'color-palette-outline' as const, label: 'Card colours' },
  { icon: 'image-outline' as const, label: 'Logo' },
  { icon: 'gift-outline' as const, label: 'Rewards & stamps' },
  { icon: 'card-outline' as const, label: 'Preview your card' },
  { icon: 'people-outline' as const, label: 'Staff / barista mode' },
  { icon: 'radio-outline' as const, label: 'Link your loyalty stamp' },
];

export default function WelcomeScreen() {
  return (
    <Screen>
      <BackHeader onBack={() => router.replace('/(onboarding)/waiting')} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Go live</Text>
        <Text variant="hero" style={styles.title}>Set up your loyalty card</Text>
        <Text muted style={styles.subtitle}>
          About 5 minutes. Your 14-day free trial starts when you link your stamp — you will land on your dashboard ready to serve customers.
        </Text>
      </View>

      <Card style={styles.list} padded={false}>
        {SETUP_STEPS.map((step, i) => (
          <View key={step.label} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={18} color={colors.accentDark} />
            </View>
            <Text variant="bodySmall" style={styles.rowLabel}>
              {i + 1}. {step.label}
            </Text>
          </View>
        ))}
      </Card>

      <Button title="Begin setup" onPress={() => router.push('/(onboarding)/biz-type')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accentDark,
    fontFamily: 'Inter_600SemiBold',
  },
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
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
});
