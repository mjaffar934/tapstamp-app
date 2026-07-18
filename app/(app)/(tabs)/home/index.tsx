import { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useDashboard } from '@/hooks/useDashboard';
import { useMonthlyUsage } from '@/hooks/useMonthlyUsage';
import { useStampLinkStatus } from '@/hooks/useStampLinkStatus';
import { LinkStampBanner } from '@/components/LinkStampBanner';
import { CustomerLimitProgress } from '@/components/CustomerLimitProgress';
import { getBusinessDisplayName, getPersonalizedGreeting } from '@/lib/greeting';
import { BusinessLogo } from '@/components/BusinessLogo';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ActivityItem } from '@/components/ui/ActivityItem';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';
import { isStarterPlan } from '@/lib/planUtils';

export default function HomeScreen() {
  const { business, user } = useAuth();
  const { cafe } = useOwnerCafe();
  const { needsLink, refetch: refetchLinkStatus } = useStampLinkStatus();
  const { stats, recentActivity, isLoading, error, refetch } = useDashboard(cafe?.id);
  const { uniqueCustomers, isLoading: usageLoading, refetch: refetchUsage } = useMonthlyUsage(cafe?.id);
  const [refreshing, setRefreshing] = useState(false);

  const showCustomerProgress = isStarterPlan(cafe?.plan) && !needsLink;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUsage(), refetchLinkStatus()]);
    setRefreshing(false);
  }, [refetch, refetchUsage, refetchLinkStatus]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchUsage();
      void refetchLinkStatus();
    }, [refetch, refetchUsage, refetchLinkStatus]),
  );

  const businessName = getBusinessDisplayName(business, cafe);

  return (
    <Screen refreshing={refreshing || isLoading} onRefresh={handleRefresh}>
      <ScreenHeader
        title={getPersonalizedGreeting(business, user)}
        subtitle={businessName}
        trailing={
          <BusinessLogo
            logoUrl={cafe?.logo_url}
            businessName={businessName}
            size={48}
          />
        }
      />

      {needsLink ? (
        <LinkStampBanner onLinked={() => void refetchLinkStatus()} />
      ) : null}

      {showCustomerProgress ? (
        <CustomerLimitProgress count={uniqueCustomers} isLoading={usageLoading} />
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text variant="bodySmall" muted style={styles.errorText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <View style={styles.statsGrid}>
        <StatCard
          label="Total customers"
          value={isLoading ? '—' : stats.totalCustomers}
          icon="people-outline"
          accent
          onPress={() => router.push('/(app)/(tabs)/customers')}
        />
        <StatCard
          label="New this month"
          value={isLoading ? '—' : stats.newCustomersThisMonth}
          icon="person-add-outline"
          onPress={() => router.push('/(app)/(tabs)/customers')}
        />
        <StatCard
          label="Stamps this week"
          value={isLoading ? '—' : stats.stampsThisWeek}
          icon="cafe-outline"
          onPress={() => router.push('/(app)/(tabs)/barista')}
        />
        <StatCard
          label="Redemptions"
          value={isLoading ? '—' : stats.redemptionsThisWeek}
          icon="gift-outline"
          onPress={() => router.push('/(app)/(tabs)/barista')}
        />
      </View>
      <Text variant="caption" muted style={styles.weekHint}>
        Weekly stats reset every Monday
      </Text>

      <Card style={styles.quickActions}>
        <Text variant="h3" style={styles.sectionTitle}>
          Quick actions
        </Text>
        <View style={styles.actionRow}>
          <Button
            title="Staff mode"
            variant="secondary"
            onPress={() => router.push('/(app)/(tabs)/barista')}
            style={styles.actionButton}
          />
          <Button
            title="New campaign"
            variant="outline"
            onPress={() => router.push('/(app)/(tabs)/campaigns')}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Recent activity</Text>
          {stats.activeCampaigns > 0 ? (
            <Text variant="caption" color={colors.success}>
              {stats.activeCampaigns} active campaign{stats.activeCampaigns === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        <Card padded={false}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : recentActivity.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={28} color={colors.textMuted} />
              <Text variant="bodySmall" muted style={styles.emptyText}>
                No stamp activity yet. Customers collect stamps by tapping your TapStamp.
              </Text>
              <Button
                title="Open staff mode"
                variant="ghost"
                onPress={() => router.push('/(app)/(tabs)/barista')}
              />
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentActivity.map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))}
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  errorText: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  weekHint: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingWrap: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
  trialPendingCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  activityList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
