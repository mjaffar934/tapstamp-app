import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { seedDevMockData } from '@/lib/devSeed';
import { colors, radius, spacing } from '@/constants/theme';

export default function DoneScreen() {
  const { refreshBusiness, user, business } = useAuth();

  const openDashboard = async () => {
    if (__DEV__) {
      const email = user?.email ?? business?.email;
      const secret = process.env.EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET;
      if (email && secret) {
        await seedDevMockData(email, secret);
      }
    }

    await refreshBusiness();
    router.replace('/(app)/(tabs)/home');
  };

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <BrandLogo size={64} />
          <View style={styles.check}>
            <Ionicons name="checkmark" size={22} color={colors.white} />
          </View>
        </View>
        <Text variant="caption" color={colors.accentDark} style={styles.eyebrow}>
          YOU'RE LIVE
        </Text>
        <Text variant="hero" style={styles.title}>Your stamp is ready</Text>
        <Text muted style={styles.subtitle}>
          Your loyalty card is active and your 14-day trial has started. Place your stamp on the counter and share your staff code with the team.
          {__DEV__ ? ' Mock customers will be added for testing.' : ''}
        </Text>
        <Button title="Open dashboard" onPress={openDashboard} style={styles.cta} />
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
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  eyebrow: {
    letterSpacing: 2,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', maxWidth: 300, lineHeight: 24 },
  cta: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
