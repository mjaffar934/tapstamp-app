import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BusinessLogo } from '@/components/BusinessLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { loadOnboardingDraft } from '@/lib/onboardingDraft';
import { useOwnerTour } from '@/contexts/OwnerTourContext';
import { colors, radius, spacing } from '@/constants/theme';

export default function DoneScreen() {
  const { refreshBusiness, business } = useAuth();
  const { cafe } = useOwnerCafe();
  const { startTourIfNeeded } = useOwnerTour();
  const [logoUri, setLogoUri] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingDraft().then((d) => setLogoUri(d.logoUri));
  }, []);

  const openDashboard = async () => {
    await refreshBusiness();
    const started = await startTourIfNeeded();
    if (!started) {
      router.replace('/(app)/(tabs)/home');
    }
  };

  const businessName = cafe?.name ?? business?.name ?? 'Your business';

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <BusinessLogo
            logoUrl={logoUri ?? cafe?.logo_url}
            businessName={businessName}
            size={72}
          />
          <View style={styles.check}>
            <Ionicons name="checkmark" size={20} color={colors.white} />
          </View>
        </View>
        <Text variant="caption" muted style={styles.eyebrow}>You&apos;re live</Text>
        <Text variant="hero" style={styles.title}>Your programme is ready</Text>
        <Text muted style={styles.subtitle}>
          Share your staff code with the team. Customers tap your TapStamp to collect stamps.
        </Text>
        <Button title="Open dashboard" onPress={() => void openDashboard()} style={styles.cta} />
        <Button
          title="Add business location"
          variant="outline"
          onPress={() => router.push('/(onboarding)/business-location')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  badge: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  eyebrow: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', maxWidth: 300, lineHeight: 24 },
  cta: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
