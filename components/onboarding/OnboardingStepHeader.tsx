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
  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: ONBOARDING_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < step ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </View>
      <Text variant="caption" muted style={styles.step}>
        Step {step} of {ONBOARDING_STEPS}
      </Text>
      <Text variant="h1" style={styles.title}>{title}</Text>
      {subtitle ? <Text muted style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, marginBottom: spacing.lg },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  dotFilled: {
    backgroundColor: colors.text,
  },
  dotEmpty: {
    backgroundColor: colors.border,
  },
  step: {
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  title: {
    letterSpacing: -0.5,
    fontSize: 28,
  },
  subtitle: {
    marginTop: spacing.sm,
    lineHeight: 24,
    maxWidth: 340,
    fontSize: 16,
  },
});
