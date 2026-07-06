import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { BrandLogo } from '@/components/BrandLogo';
import { useStaff } from '@/contexts/StaffContext';
import { colors, radius, spacing, shadows } from '@/constants/theme';

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
      <View style={styles.wrap}>
        <BackHeader />
        <View style={styles.hero}>
          <BrandLogo size={48} />
          <Text variant="caption" muted style={styles.eyebrow}>TapStamp</Text>
          <Text variant="hero" style={styles.heroTitle}>Staff mode</Text>
          <Text muted style={styles.heroSub}>
            Enter the staff code from Settings. Stamp and redeem when customers tap your TapStamp.
          </Text>
          <View style={styles.accentLine} />
        </View>

        <View style={styles.form}>
          <View style={styles.iconRow}>
            <View style={styles.iconBox}>
              <Ionicons name="radio-outline" size={22} color={colors.accentDark} />
            </View>
            <Text variant="caption" muted style={styles.iconHint}>
              No owner login needed on shared devices
            </Text>
          </View>
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
          <Button title="Open staff mode" onPress={handleJoin} loading={loading} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  eyebrow: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  heroTitle: {
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    lineHeight: 24,
    maxWidth: 320,
    textAlign: 'center',
    fontSize: 16,
  },
  accentLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHint: {
    flex: 1,
  },
});
