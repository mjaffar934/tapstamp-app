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
          <BrandLogo size={56} />
          <View style={styles.check}>
            <Ionicons name="checkmark" size={20} color={colors.white} />
          </View>
        </View>
        <Text variant="caption" muted style={styles.eyebrow}>You&apos;re live</Text>
        <Text variant="hero" style={styles.title}>Your programme is ready</Text>
        <Text muted style={styles.subtitle}>
          Share your staff code with the team. Customers tap your TapStamp to collect stamps.
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
