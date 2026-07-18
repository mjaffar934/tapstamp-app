import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STARTER_MONTHLY_CUSTOMER_LIMIT } from '@/constants/plans';
import { colors, spacing } from '@/constants/theme';

interface StarterUsageBannerProps {
  count: number;
  isLoading?: boolean;
  billingReady?: boolean;
  onSetupBilling?: () => void;
  setupLoading?: boolean;
}

export function StarterUsageBanner({
  count,
  isLoading,
  billingReady = false,
  onSetupBilling,
  setupLoading,
}: StarterUsageBannerProps) {
  const limit = STARTER_MONTHLY_CUSTOMER_LIMIT;
  const remaining = Math.max(0, limit - count);
  const atLimit = count >= limit;
  const nearLimit = count >= limit - 5 && !atLimit;
  const remindBilling = !billingReady && (count >= 30 || nearLimit || atLimit);

  if (isLoading) return null;

  return (
    <Card style={[styles.card, (atLimit || remindBilling) && styles.cardWarning]}>
      <View style={styles.row}>
        <Ionicons
          name={atLimit ? 'alert-circle-outline' : remindBilling ? 'card-outline' : 'people-outline'}
          size={20}
          color={atLimit || remindBilling ? colors.error : colors.accentDark}
        />
        <View style={styles.text}>
          <Text variant="bodySmall" color={atLimit || remindBilling ? colors.error : undefined}>
            {count} / {limit} unique customers this month
          </Text>
          <Text variant="caption" muted>
            {atLimit
              ? billingReady
                ? 'Limit reached — upgrading to Pro and charging £25/mo.'
                : 'Limit reached. Add a card so TapStamp can start Pro (£25/mo) and keep new customers joining.'
              : remindBilling
                ? `Add a card before you hit ${limit}. At the limit we start Pro (£25/mo) automatically.`
                : nearLimit
                  ? `${remaining} spot${remaining === 1 ? '' : 's'} left this month on Starter.`
                  : 'Unique customers who stamped this month — each person counts once, resets on the 1st.'}
          </Text>
        </View>
      </View>
      {remindBilling && onSetupBilling ? (
        <Button
          title={setupLoading ? 'Opening…' : 'Add card for billing'}
          variant="outline"
          onPress={onSetupBilling}
          loading={setupLoading}
          style={styles.cta}
        />
      ) : (atLimit || nearLimit) ? (
        <Button
          title="Manage plan"
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  cta: {
    marginTop: spacing.xs,
  },
});
