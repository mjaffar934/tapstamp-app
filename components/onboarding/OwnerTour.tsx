import { Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

export interface OwnerTourStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  route: Href;
}

interface OwnerTourProps {
  visible: boolean;
  step: number;
  steps: OwnerTourStep[];
  onNext: () => void;
  onSkip: () => void;
}

export function OwnerTour({ visible, step, steps, onNext, onSkip }: OwnerTourProps) {
  const current = steps[step];
  const isLast = step === steps.length - 1;

  if (!current) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={28} color={colors.accentDark} />
          </View>
          <Text variant="caption" muted style={styles.step}>
            {step + 1} of {steps.length}
          </Text>
          <Text variant="heading" style={styles.title}>{current.title}</Text>
          <Text variant="body" muted style={styles.body}>{current.body}</Text>
          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <Button title={isLast ? 'Get started' : 'Next'} onPress={onNext} />
          <Button title="Skip tour" variant="ghost" onPress={onSkip} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  step: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 18,
  },
});
