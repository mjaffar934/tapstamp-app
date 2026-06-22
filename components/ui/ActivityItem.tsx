import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';
import { Text } from './Text';
import type { LoyaltyActivity } from '@/types/database';

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface ActivityItemProps {
  event: LoyaltyActivity;
}

export function ActivityItem({ event }: ActivityItemProps) {
  const isStamp = event.type === 'stamp';
  const customerName = event.customerName ?? 'Customer';

  return (
    <View style={styles.row}>
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
          {formatRelativeTime(event.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
