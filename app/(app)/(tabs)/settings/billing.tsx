import { View, StyleSheet, Linking, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useMonthlyUsage } from '@/hooks/useMonthlyUsage';
import { openBillingPortal } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrialBanner } from '@/components/TrialBanner';
import { StarterUsageBanner } from '@/components/StarterUsageBanner';
import { PLANS, STARTER_MONTHLY_CUSTOMER_LIMIT, HARDWARE_PRICE_GBP } from '@/constants/plans';
import { SUPPORT_EMAIL } from '@/constants/config';
import { parsePlanId } from '@/constants/plans';
import {
  isTrialActive,
  trialEnded,
  shouldEnforceStarterLimit,
  isPaidPlan,
} from '@/lib/planUtils';
import { colors, spacing } from '@/constants/theme';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BillingScreen() {
  const { business } = useAuth();
  const { cafe, isLoading } = useOwnerCafe();
  const { uniqueCustomers, isLoading: usageLoading } = useMonthlyUsage(cafe?.id);
  const [portalLoading, setPortalLoading] = useState(false);

  const planId = parsePlanId(cafe?.plan ?? business?.plan_selected ?? undefined);
  const plan = PLANS[planId];
  const onTrial = isTrialActive(cafe?.trial_ends_at);
  const trialOver = trialEnded(cafe?.trial_ends_at);
  const starterLimited = shouldEnforceStarterLimit(cafe?.plan, cafe?.trial_ends_at);
  const paidActive = isPaidPlan(cafe?.plan) && cafe?.subscription_status === 'active';
  const hasStripeCustomer = Boolean(business?.stripe_customer_id);

  const manageBilling = async () => {
    setPortalLoading(true);
    const result = await openBillingPortal();
    setPortalLoading(false);

    if (result.error || !result.portalUrl) {
      Alert.alert('Billing', result.error ?? 'Could not open billing portal');
      return;
    }

    await Linking.openURL(result.portalUrl);
  };

  const contactUpgrade = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=TapStamp%20upgrade`);
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader />
      <ScreenHeader compact title="Billing" subtitle="Your TapStamp plan, trial, and usage." />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Link your account to a cafe to view billing.</Text>
        </Card>
      ) : (
        <>
          {onTrial ? (
            <TrialBanner
              trialEndsAt={cafe.trial_ends_at}
              planName={plan.name}
              monthlyPrice={plan.monthlyGbp != null ? `£${plan.monthlyGbp}/mo` : null}
            />
          ) : null}

          <Card style={styles.card}>
            <Text variant="caption" muted>CURRENT PLAN</Text>
            <Text variant="h2">{plan.name}</Text>
            {onTrial ? (
              <Text variant="bodySmall" muted>
                Trial ends {formatDate(cafe.trial_ends_at)}
              </Text>
            ) : trialOver && plan.monthlyGbp != null ? (
              <Text variant="bodySmall" muted>
                £{plan.monthlyGbp}/month{paidActive ? '' : ' — payment required'}
              </Text>
            ) : trialOver && planId === 'starter' ? (
              <Text variant="bodySmall" muted>
                Free forever · up to {STARTER_MONTHLY_CUSTOMER_LIMIT} customers/month
              </Text>
            ) : (
              <Text variant="bodySmall" muted>
                14-day trial starts when you go live
              </Text>
            )}
          </Card>

          {starterLimited ? (
            <StarterUsageBanner count={uniqueCustomers} isLoading={usageLoading} />
          ) : null}

          <Card style={styles.card}>
            <Text variant="caption" muted>HARDWARE</Text>
            <Text variant="body">Loyalty stamp · £{HARDWARE_PRICE_GBP}</Text>
            <Text variant="bodySmall" muted>Paid when you ordered your stamp</Text>
          </Card>

          <Card style={styles.card}>
            <Text variant="caption" muted>STATUS</Text>
            <Text variant="body" color={cafe.status === 'suspended' ? colors.error : colors.success}>
              {cafe.status === 'suspended' ? 'Suspended' : onTrial ? 'Trial' : 'Active'}
            </Text>
            {cafe.subscription_status === 'past_due' ? (
              <Text variant="bodySmall" muted>Update your payment method to restore service.</Text>
            ) : null}
          </Card>

          {hasStripeCustomer ? (
            <Button
              title="Manage billing in Stripe"
              onPress={manageBilling}
              loading={portalLoading}
              style={styles.cta}
            />
          ) : null}

          {planId === 'starter' ? (
            <Button title="Upgrade to Pro" variant="outline" onPress={contactUpgrade} style={styles.cta} />
          ) : null}

          {!hasStripeCustomer && trialOver && !paidActive && isPaidPlan(cafe.plan) ? (
            <Button title="Contact support" onPress={contactUpgrade} style={styles.cta} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { gap: spacing.xs, marginBottom: spacing.md },
  cta: { marginBottom: spacing.md },
});
