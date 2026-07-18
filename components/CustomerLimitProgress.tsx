import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STARTER_MONTHLY_CUSTOMER_LIMIT } from '@/constants/plans';
import { colors, radius, spacing } from '@/constants/theme';

interface CustomerLimitProgressProps {
  count: number;
  isLoading?: boolean;
  limit?: number;
}

export function CustomerLimitProgress({
  count,
  isLoading,
  limit = STARTER_MONTHLY_CUSTOMER_LIMIT,
}: CustomerLimitProgressProps) {
  const safeCount = Math.max(0, count);
  const progress = Math.min(1, safeCount / limit);
  const remaining = Math.max(0, limit - safeCount);
  const atLimit = safeCount >= limit;
  const nearLimit = safeCount >= limit - 5 && !atLimit;
  const percent = Math.round(progress * 100);

  if (isLoading) return null;

  return (
    <Card style={[styles.card, atLimit && styles.cardWarning]}>
      <View style={styles.header}>
        <Text variant="caption" muted>STARTER PLAN</Text>
        <Text variant="bodySmall" style={styles.count}>
          {safeCount} / {limit} unique this month
        </Text>
      </View>

      <View style={styles.track} accessibilityRole="progressbar">
        <View style={[styles.fill, { width: `${percent}%` }, atLimit && styles.fillFull]} />
      </View>

      <View style={styles.footer}>
        <Ionicons
          name={atLimit ? 'alert-circle-outline' : 'people-outline'}
          size={18}
          color={atLimit ? colors.error : colors.accentDark}
        />
        <Text variant="caption" muted style={styles.footerText}>
          {atLimit
            ? 'Limit reached. Add a card in Billing so Pro (£25/mo) can start and new customers keep joining.'
            : nearLimit
              ? `${remaining} spot${remaining === 1 ? '' : 's'} left — add billing so we can auto-upgrade at 50.`
              : safeCount >= 30
                ? 'Add a card in Billing before you hit 50 — we start Pro (£25/mo) automatically.'
                : 'Each person who stamps counts once per month. Regulars count again next month.'}
        </Text>
      </View>

      {(atLimit || nearLimit || safeCount >= 30) ? (
        <Button
          title="Set up billing"
          variant="outline"
          onPress={() => router.push('/(app)/(tabs)/settings/billing')}
          style={styles.cta}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardWarning: {
    backgroundColor: colors.surfaceElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  count: {
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  fillFull: {
    backgroundColor: colors.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  footerText: {
    flex: 1,
  },
  cta: {
    marginTop: spacing.xs,
  },
});
