import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ONBOARDING_STEPS } from '@/constants/onboarding';
import { colors, spacing } from '@/constants/theme';

interface Props {
  step: number;
  title: string;
  subtitle?: string;
}

export function OnboardingStepHeader({ step, title, subtitle }: Props) {
  const progress = step / ONBOARDING_STEPS;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text variant="caption" color={colors.accentDark} style={styles.step}>
        Step {step} of {ONBOARDING_STEPS}
      </Text>
      <Text variant="h1" style={styles.title}>{title}</Text>
      {subtitle ? <Text muted style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, marginBottom: spacing.lg },
  track: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  step: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: { letterSpacing: -0.3 },
  subtitle: { marginTop: spacing.xs, lineHeight: 24, maxWidth: 340 },
});
