import { View, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
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
import { SUPPORT_EMAIL } from '@/constants/config';
import { parsePlanId } from '@/constants/plans';
import { shouldEnforceStarterLimit } from '@/lib/planUtils';
import { colors, spacing } from '@/constants/theme';

export default function BillingScreen() {
  const { business, refreshBusiness } = useAuth();
  const { cafe, isLoading } = useOwnerCafe();
  const { uniqueCustomers, isLoading: usageLoading } = useMonthlyUsage(cafe?.id);
  const [portalLoading, setPortalLoading] = useState(false);
  const alert = useTapStampAlert();

  useFocusEffect(
    useCallback(() => {
      void refreshBusiness();
    }, [refreshBusiness]),
  );

  const planId = parsePlanId(cafe?.plan ?? business?.plan_selected ?? undefined);
  const plan = PLANS[planId];
  const starterLimited = shouldEnforceStarterLimit(cafe?.plan, cafe?.trial_ends_at);
  const hasCard = Boolean(business?.billing_card_added_at);
  const hasStripeCustomer = Boolean(business?.stripe_customer_id);
  const subStatus = business?.subscription_status ?? cafe?.subscription_status ?? 'none';

  const billingStatus = (() => {
    if (cafe?.status === 'suspended' || subStatus === 'canceled') {
      return { label: 'Suspended', color: colors.error };
    }
    if (subStatus === 'past_due') {
      return { label: 'Payment failed — update card', color: colors.error };
    }
    if (!hasCard) {
      return { label: 'Inactive until card added', color: colors.warning };
    }
    return { label: 'Active', color: colors.success };
  })();

  const openBilling = async (setup = false) => {
    setPortalLoading(true);
    await refreshBusiness();
    const result = await openBillingPortal(setup);
    setPortalLoading(false);

    if (result.error || !result.portalUrl) {
      alert(
        'Billing',
        result.error ??
          'Could not open Stripe billing. In Stripe Dashboard, enable Customer Portal under Settings → Billing.',
      );
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
      <BackHeader onBack={() => router.replace('/(app)/(tabs)/settings')} />
      <ScreenHeader compact title="Plan" subtitle="Your TapStamp plan and Stripe billing." />

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
                Free up to {STARTER_MONTHLY_CUSTOMER_LIMIT} unique customers/month. When the {STARTER_MONTHLY_CUSTOMER_LIMIT}th new customer joins and a card is on file, Stripe starts Pro (£25/mo) automatically.
              </Text>
            ) : (
              <Text variant="bodySmall" muted>{plan.tagline.replace(/after trial/gi, '').trim() || plan.tagline}</Text>
            )}
          </Card>

          {starterLimited || planId === 'starter' ? (
            <StarterUsageBanner
              count={uniqueCustomers}
              isLoading={usageLoading}
              billingReady={hasCard}
              onSetupBilling={() => void openBilling(true)}
              setupLoading={portalLoading}
            />
          ) : null}

          <Card style={styles.card}>
            <Text variant="caption" muted>STATUS</Text>
            <Text variant="body" color={billingStatus.color}>
              {billingStatus.label}
            </Text>
            {!hasCard ? (
              <Text variant="caption" muted>
                Add a card below. Billing stays inactive until then.
              </Text>
            ) : null}
          </Card>

          {!hasCard ? (
            <Card style={styles.card}>
              <Text variant="bodySmall">
                Add a card in Stripe now. At {STARTER_MONTHLY_CUSTOMER_LIMIT} unique customers this month we create a Pro subscription and charge £25/mo on that card — no manual step.
              </Text>
              <Button
                title="Add card for billing"
                onPress={() => void openBilling(true)}
                loading={portalLoading}
                style={styles.cta}
              />
            </Card>
          ) : (
            <Card style={styles.card}>
              <Text variant="bodySmall" muted>
                Open your Stripe Customer Portal to update the card, download invoices, or cancel.
              </Text>
              <Button
                title="Open Stripe billing portal"
                onPress={() => void openBilling(false)}
                loading={portalLoading}
                style={styles.cta}
              />
              {hasStripeCustomer ? (
                <Button
                  title="Update payment method"
                  variant="outline"
                  onPress={() => void openBilling(true)}
                  loading={portalLoading}
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
  cta: { marginTop: spacing.sm, marginBottom: spacing.sm },
});
