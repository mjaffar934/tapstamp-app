import { View, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useMonthlyUsage } from '@/hooks/useMonthlyUsage';
import { openBillingPortal } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StarterUsageBanner } from '@/components/StarterUsageBanner';
import { PLANS, STARTER_MONTHLY_CUSTOMER_LIMIT } from '@/constants/plans';
import { SUPPORT_EMAIL, orderSignupUrl } from '@/constants/config';
import { parsePlanId } from '@/constants/plans';
import { shouldEnforceStarterLimit } from '@/lib/planUtils';
import { colors, spacing } from '@/constants/theme';

export default function BillingScreen() {
  const { business } = useAuth();
  const { cafe, isLoading } = useOwnerCafe();
  const { uniqueCustomers, isLoading: usageLoading } = useMonthlyUsage(cafe?.id);
  const [portalLoading, setPortalLoading] = useState(false);
  const alert = useTapStampAlert();

  const planId = parsePlanId(cafe?.plan ?? business?.plan_selected ?? undefined);
  const plan = PLANS[planId];
  const starterLimited = shouldEnforceStarterLimit(cafe?.plan, cafe?.trial_ends_at);
  const hasStripeCustomer = Boolean(business?.stripe_customer_id);

  const manageBilling = async () => {
    setPortalLoading(true);
    const result = await openBillingPortal();
    setPortalLoading(false);

    if (result.error || !result.portalUrl) {
      alert('Billing', result.error ?? 'Could not open billing portal');
      return;
    }

    await Linking.openURL(result.portalUrl);
  };

  const contactSupport = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('TapStamp plan')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      alert('Contact us', SUPPORT_EMAIL);
      return;
    }
    await Linking.openURL(url);
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
      <ScreenHeader compact title="Plan" subtitle="Your TapStamp plan and usage." />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Complete setup to view your plan.</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Text variant="caption" muted>CURRENT PLAN</Text>
            <Text variant="h2">{plan.name}</Text>
            {planId === 'starter' ? (
              <Text variant="bodySmall" muted>
                Free · up to {STARTER_MONTHLY_CUSTOMER_LIMIT} unique customers/month (resets on the 1st)
              </Text>
            ) : (
              <Text variant="bodySmall" muted>{plan.tagline.replace(/after trial/gi, '').trim() || plan.tagline}</Text>
            )}
          </Card>

          {starterLimited ? (
            <StarterUsageBanner count={uniqueCustomers} isLoading={usageLoading} />
          ) : null}

          <Card style={styles.card}>
            <Text variant="caption" muted>STATUS</Text>
            <Text variant="body" color={cafe.status === 'suspended' ? colors.error : colors.success}>
              {cafe.status === 'suspended' ? 'Suspended' : 'Active'}
            </Text>
          </Card>

          {hasStripeCustomer ? (
            <Button
              title="Manage billing"
              onPress={manageBilling}
              loading={portalLoading}
              style={styles.cta}
            />
          ) : (
            <Card style={styles.card}>
              <Text variant="bodySmall" muted>
                Billing portal unlocks after you complete a plan order on tapstamp.co (creates your Stripe account).
                Dev/test accounts created in-app won&apos;t have this until checkout.
              </Text>
              {orderSignupUrl('pro') ? (
                <Button
                  title="Upgrade on tapstamp.co"
                  variant="outline"
                  onPress={() => Linking.openURL(orderSignupUrl('pro'))}
                  style={styles.cta}
                />
              ) : null}
            </Card>
          )}

          <Button title="Contact TapStamp" variant="outline" onPress={contactSupport} style={styles.cta} />
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
