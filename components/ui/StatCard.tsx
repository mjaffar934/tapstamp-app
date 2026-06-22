import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';
import { Text } from './Text';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: string;
  accent?: boolean;
  onPress?: () => void;
}

export function StatCard({ label, value, icon, trend, accent, onPress }: StatCardProps) {
  const content = (
    <>
      <View style={[styles.iconWrap, accent && styles.accentIconWrap]}>
        <Ionicons
          name={icon}
          size={20}
          color={accent ? colors.white : colors.accent}
        />
      </View>
      <Text variant="h2" color={accent ? colors.white : undefined} style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" muted={!accent} color={accent ? 'rgba(255,255,255,0.85)' : undefined}>
        {label}
      </Text>
      {trend ? (
        <Text variant="caption" color={colors.success} style={styles.trend}>
          {trend}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          accent && styles.accentCard,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, accent && styles.accentCard]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  accentCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  accentIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  value: {
    marginTop: spacing.xs,
  },
  trend: {
    marginTop: 2,
  },
});
