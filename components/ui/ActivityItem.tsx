import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';
import { Text } from './Text';
import type { LoyaltyActivity } from '@/types/database';

function formatActivityTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (diffMins < 1) return `Just now · ${clock}`;
  if (diffMins < 60) return `${diffMins}m ago · ${clock}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago · ${clock}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago · ${clock}`;
}

interface ActivityItemProps {
  event: LoyaltyActivity;
  onPress?: (event: LoyaltyActivity) => void;
}

export function ActivityItem({ event, onPress }: ActivityItemProps) {
  const isStamp = event.type === 'stamp';
  const customerName = event.customerName ?? 'Customer';
  const meta = [
    event.memberCode ? `#${event.memberCode}` : null,
    event.stampCount != null ? `${event.stampCount} stamps` : null,
  ].filter(Boolean).join(' · ');

  const content = (
    <>
      <View style={[styles.icon, isStamp ? styles.earn : styles.redeem]}>
        <Ionicons
          name={isStamp ? 'cafe-outline' : 'gift-outline'}
          size={18}
          color={isStamp ? colors.success : colors.accentDark}
        />
      </View>
      <View style={styles.content}>
        <Text variant="bodySmall" style={styles.title}>
          {isStamp
            ? `${customerName} collected a stamp`
            : `${customerName} redeemed a reward`}
        </Text>
        <Text variant="caption" muted>
          {formatActivityTime(event.created_at)}
          {meta ? ` · ${meta}` : ''}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(event)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${customerName} details`}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earn: {
    backgroundColor: colors.successMuted,
  },
  redeem: {
    backgroundColor: colors.accentMuted,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '500',
  },
});
