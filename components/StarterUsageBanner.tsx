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
}

export function StarterUsageBanner({ count, isLoading }: StarterUsageBannerProps) {
  const limit = STARTER_MONTHLY_CUSTOMER_LIMIT;
  const remaining = Math.max(0, limit - count);
  const atLimit = count >= limit;
  const nearLimit = count >= limit - 5 && !atLimit;

  if (isLoading) return null;

  return (
    <Card style={[styles.card, atLimit && styles.cardWarning]}>
      <View style={styles.row}>
        <Ionicons
          name={atLimit ? 'alert-circle-outline' : 'people-outline'}
          size={20}
          color={atLimit ? colors.error : colors.accentDark}
        />
        <View style={styles.text}>
          <Text variant="bodySmall" color={atLimit ? colors.error : undefined}>
            {count} / {limit} unique customers this month
          </Text>
          <Text variant="caption" muted>
            {atLimit
              ? '50 unique customers reached this month — new sign-ups pause until the 1st.'
              : nearLimit
                ? `${remaining} spot${remaining === 1 ? '' : 's'} left this month on Starter.`
                : 'Unique customers who stamped this month — each person counts once, resets on the 1st.'}
          </Text>
        </View>
      </View>
      {(atLimit || nearLimit) ? (
        <Button
          title="Upgrade to Pro"
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
