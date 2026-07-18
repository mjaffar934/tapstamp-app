import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { restartOnboardingForDev } from '@/lib/restartOnboarding';
import { isAdminUser } from '@/constants/adminAuth';
import { getBusinessDisplayName } from '@/lib/greeting';
import { colors, spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { business, signOut, user } = useAuth();
  const { cafe, refetch } = useOwnerCafe();
  const [devBusy, setDevBusy] = useState(false);
  const alert = useTapStampAlert();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleRestartOnboarding = () => {
    if (!user?.id) return;
    alert(
      'Restart onboarding?',
      'This resets onboarding for testing. You will go through the full flow again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            setDevBusy(true);
            const result = await restartOnboardingForDev(user.id);
            setDevBusy(false);
            if (result.error) alert('Could not restart', result.error);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Settings"
        subtitle={getBusinessDisplayName(business, cafe)}
      />

      {cafe?.staff_code ? (
        <Card style={styles.staffCard}>
          <Text variant="caption" muted>STAFF CODE</Text>
          <Text variant="h2" style={styles.staffCode}>{cafe.staff_code}</Text>
          <Text variant="bodySmall" muted>
            Share this with staff so they can open Staff mode on a shared device.
          </Text>
        </Card>
      ) : null}

      <Card padded={false} style={styles.section}>
        <Text variant="caption" muted style={styles.sectionLabel}>
          LOYALTY
        </Text>
        <SettingsRow
          title="Card settings"
          subtitle="Stamps per reward, messages, logo"
          icon="card-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/card-settings')}
        />
        <SettingsRow
          title="Pass design"
          subtitle="Classic TapStamp or AI shop card"
          icon="color-palette-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/pass-design')}
        />
        <SettingsRow
          title="Stamp levels"
          subtitle="Optional: 5 = pastry, 10 = coffee…"
          icon="trophy-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/tiers')}
        />
        <SettingsRow
          title="Share programme"
          subtitle="Signup link for your stamp"
          icon="share-social-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/share')}
        />
      </Card>

      <Card padded={false} style={styles.section}>
        <Text variant="caption" muted style={styles.sectionLabel}>
          BUSINESS
        </Text>
        {isAdminUser(user?.email) ? (
          <>
            <SettingsRow
              title="Stamp codes"
              subtitle="Generate NFC codes for programming stamps"
              icon="radio-outline"
              onPress={() => router.push('/(app)/(tabs)/settings/stamp-codes')}
            />
            <SettingsRow
              title="Create client"
              subtitle="Manual account setup (optional)"
              icon="person-add-outline"
              onPress={() => router.push('/(app)/(tabs)/settings/create-client')}
            />
          </>
        ) : null}
        <SettingsRow
          title="Locations"
          subtitle="Business address and details"
          icon="location-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/locations')}
        />
        <SettingsRow
          title="Billing"
          subtitle="Your plan"
          icon="card-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/billing')}
        />
        <SettingsRow
          title="Account"
          subtitle="Email, password, team"
          icon="person-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/account')}
        />
      </Card>

      {isAdminUser(user?.email) || __DEV__ ? (
        <Card style={styles.devCard}>
          <Text variant="caption" muted>ADMIN</Text>
          <Text variant="bodySmall" muted>
            Restart onboarding for this account (quiz and pass design).
          </Text>
          <Button
            title="Restart onboarding"
            variant="outline"
            onPress={handleRestartOnboarding}
            loading={devBusy}
          />
        </Card>
      ) : null}

      <Button title="Sign out" variant="outline" onPress={signOut} style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  signOut: {
    marginTop: spacing.md,
  },
  staffCard: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.accentMuted,
  },
  staffCode: {
    letterSpacing: 4,
  },
  devCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
});
