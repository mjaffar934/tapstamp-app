import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { TRIAL_DAYS, trialDaysRemaining } from '@/lib/planUtils';
import { colors, spacing } from '@/constants/theme';

interface TrialBannerProps {
  trialEndsAt: string | null | undefined;
  planName: string;
  monthlyPrice: string | null;
}

export function TrialBanner({ trialEndsAt, planName, monthlyPrice }: TrialBannerProps) {
  const daysLeft = trialDaysRemaining(trialEndsAt);
  if (daysLeft <= 0) return null;

  const afterTrial =
    monthlyPrice == null
      ? `then your ${planName} plan continues`
      : `then ${monthlyPrice} for ${planName}`;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={20} color={colors.accentDark} />
        <View style={styles.text}>
          <Text variant="bodySmall" color={colors.accentDark}>
            {daysLeft} day{daysLeft === 1 ? '' : 's'} left in your {TRIAL_DAYS}-day trial
          </Text>
          <Text variant="caption" muted>
            {afterTrial}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
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
});
