import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { restartOnboardingForDev } from '@/lib/restartOnboarding';
import { seedDevMockData } from '@/lib/devSeed';
import { isAdminUser } from '@/constants/adminAuth';
import { colors, spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { business, signOut, user } = useAuth();
  const { cafe, refetch } = useOwnerCafe();
  const [devBusy, setDevBusy] = useState(false);

  const handleRestartOnboarding = () => {
    if (!user?.id) return;
    Alert.alert(
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
            if (result.error) Alert.alert('Could not restart', result.error);
          },
        },
      ],
    );
  };

  const handleSeedMockData = async () => {
    const email = user?.email ?? business?.email;
    const secret = process.env.EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET;
    if (!email || !secret) {
      Alert.alert('Dev seed unavailable', 'Set EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET in .env');
      return;
    }

    setDevBusy(true);
    const result = await seedDevMockData(email, secret);
    setDevBusy(false);

    if (result.error) {
      Alert.alert('Seed failed', result.error);
      return;
    }

    await refetch();
    Alert.alert(
      'Mock data ready',
      result.seeded === 0
        ? 'Your cafe already has customers — no new mock data added.'
        : `Added ${result.seeded} mock customers for testing.`,
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Settings"
        subtitle={business?.name ?? cafe?.name ?? 'Your business'}
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
          subtitle="Stamps per reward, card design"
          icon="card-outline"
          onPress={() => router.push('/(app)/(tabs)/settings/card-settings')}
        />
        <SettingsRow
          title="Reward tiers"
          subtitle="VIP levels and perks"
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

      {__DEV__ ? (
        <Card style={styles.devCard}>
          <Text variant="caption" muted>DEVELOPER</Text>
          <Text variant="bodySmall" muted>
            Testing tools — only visible in development builds.
          </Text>
          <Button
            title="Restart full onboarding"
            variant="outline"
            onPress={handleRestartOnboarding}
            loading={devBusy}
          />
          <Button
            title="Seed mock customers"
            variant="outline"
            onPress={handleSeedMockData}
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
