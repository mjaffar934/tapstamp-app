import { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { callBaristaAction } from '@/lib/api';
import { usePass } from '@/hooks/usePass';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

function displayName(name: string | null, email: string | null): string {
  if (name?.trim()) return name.trim();
  if (email?.trim()) return email.trim();
  return 'Anonymous member';
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pass, stamps, redemptions, stampGoal, reward, isLoading, error, refetch } = usePass(id);
  const [acting, setActing] = useState(false);

  const handleAction = async (action: 'stamp' | 'redeem') => {
    if (!pass) return;
    setActing(true);
    const result = await callBaristaAction(pass.serial_number, action);
    setActing(false);

    if (result.error) {
      const message =
        result.error === 'cooldown'
          ? 'This pass was stamped recently. Try again later.'
          : result.error === 'not_ready'
            ? 'Reward is not ready to redeem yet.'
            : result.error;
      Alert.alert('Could not complete', message);
      return;
    }

    await refetch();
    Alert.alert(
      action === 'stamp' ? 'Stamp added' : 'Reward redeemed',
      action === 'stamp'
        ? `Pass is now at ${result.stampCount ?? pass.stamp_count} stamps.`
        : 'Pass has been reset for a new cycle.',
    );
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <BackHeader />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (error || !pass) {
    return (
      <Screen>
        <BackHeader />
        <Card>
          <Text variant="bodySmall" muted>{error ?? 'Customer not found'}</Text>
        </Card>
      </Screen>
    );
  }

  const name = displayName(pass.customer_name, pass.customer_email);
  const remaining = Math.max(0, stampGoal - pass.stamp_count);

  return (
    <Screen>
      <BackHeader />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text variant="h2" color={colors.accentDark}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text variant="h1">{name}</Text>
        {pass.customer_email ? <Text muted>{pass.customer_email}</Text> : null}
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text variant="h2">{pass.stamp_count}</Text>
          <Text variant="caption" muted>
            Current stamps
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Text variant="h2">{pass.lifetime_stamps}</Text>
          <Text variant="caption" muted>
            Lifetime stamps
          </Text>
        </Card>
      </View>

      <Card style={styles.card}>
        <Text variant="h3">Stamp progress</Text>
        <View style={styles.stamps}>
          {Array.from({ length: stampGoal }).map((_, i) => (
            <View key={i} style={[styles.stamp, i < pass.stamp_count && styles.stampFilled]} />
          ))}
        </View>
        <Text variant="caption" muted>
          {pass.status === 'redeemed'
            ? `Ready to redeem: ${reward}`
            : remaining === 0
              ? `Reward unlocked: ${reward}`
              : `${remaining} more stamp${remaining === 1 ? '' : 's'} until ${reward}`}
        </Text>
      </Card>

      {(stamps.length > 0 || redemptions.length > 0) ? (
        <Card style={styles.card}>
          <Text variant="h3">Activity</Text>
          {stamps.slice(0, 8).map((stamp) => (
            <View key={stamp.id} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <View style={styles.activityText}>
                <Text variant="bodySmall">Stamp collected</Text>
                <Text variant="caption" muted>
                  {new Date(stamp.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
          {redemptions.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.activityRow}>
              <View style={[styles.activityDot, styles.activityDotRedeem]} />
              <View style={styles.activityText}>
                <Text variant="bodySmall">Reward redeemed</Text>
                <Text variant="caption" muted>
                  {new Date(r.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Add stamp"
          onPress={() => handleAction('stamp')}
          loading={acting}
          disabled={acting || pass.status === 'redeemed'}
        />
        <Button
          title="Redeem reward"
          variant="outline"
          onPress={() => handleAction('redeem')}
          loading={acting}
          disabled={acting || pass.status !== 'redeemed'}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stamps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stamp: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  stampFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderStyle: 'solid',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  activityDotRedeem: {
    backgroundColor: colors.success,
  },
  activityText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: spacing.sm,
  },
});
