import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { useStaff } from '@/contexts/StaffContext';
import { TAPSTAMP_BRAND } from '@/constants/tapstampBrand';
import { colors, radius, spacing } from '@/constants/theme';

export default function StaffLoginScreen() {
  const { signInWithCode } = useStaff();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError(null);
    if (!code.trim()) {
      setError('Enter your staff code');
      return;
    }
    setLoading(true);
    const result = await signInWithCode(code.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/(staff)/barista');
  };

  return (
    <Screen scroll={false} safe padded={false}>
      <View style={styles.hero}>
        <View style={styles.backRow}>
          <BackHeader />
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="scan-outline" size={28} color={TAPSTAMP_BRAND.foregroundColor} />
        </View>
        <Text variant="hero" style={styles.heroTitle}>Barista mode</Text>
        <Text style={styles.heroSub}>
          Enter the staff code from Settings. Stamp and redeem without the owner login.
        </Text>
      </View>

      <View style={styles.sheet}>
        <View style={styles.form}>
          <Input
            label="Staff code"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            placeholder="ABC123"
          />
          {error ? (
            <Text variant="caption" color={colors.error}>{error}</Text>
          ) : null}
          <Button title="Open barista mode" onPress={handleJoin} loading={loading} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: TAPSTAMP_BRAND.backgroundColor,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  backRow: {
    marginBottom: spacing.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(201,169,110,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 24,
    maxWidth: 320,
    fontSize: 16,
  },
  sheet: {
    padding: spacing.lg,
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
