import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/constants/theme';

export type OwnerFlowStep = 'account' | 'activate' | 'setup' | 'live';

const STEPS: { id: OwnerFlowStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'account', label: 'Account', icon: 'person-outline' },
  { id: 'activate', label: 'Tap stamp', icon: 'radio-outline' },
  { id: 'setup', label: 'Your card', icon: 'card-outline' },
  { id: 'live', label: 'Live', icon: 'sparkles-outline' },
];

interface Props {
  current: OwnerFlowStep;
  compact?: boolean;
}

export function OwnerFlowSteps({ current, compact }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <View key={step.id} style={styles.item}>
            <View
              style={[
                styles.icon,
                done && styles.iconDone,
                active && styles.iconActive,
              ]}
            >
              <Ionicons
                name={done ? 'checkmark' : step.icon}
                size={compact ? 14 : 16}
                color={active || done ? colors.white : colors.textSecondary}
              />
            </View>
            {!compact ? (
              <Text
                variant="caption"
                style={[styles.label, active && styles.labelActive]}
              >
                {step.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  wrapCompact: {
    paddingVertical: 0,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconDone: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  iconActive: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accentDark,
  },
  label: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
