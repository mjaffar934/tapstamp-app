import { useEffect, useState } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Linking,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLinking from 'expo-linking';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORT_EMAIL, orderSignupUrl } from '@/constants/config';
import {
  DEV_BOOTSTRAP_SECRET,
  DEV_EMAIL,
  DEV_PASSWORD,
  hasDevBootstrap,
  hasDevCredentials,
} from '@/constants/devAuth';
import { colors, radius, spacing, shadows } from '@/constants/theme';

function parseEmailFromUrl(url: string): string | null {
  try {
    const parsed = ExpoLinking.parse(url);
    const email = parsed.queryParams?.email;
    if (typeof email === 'string' && email.includes('@')) {
      return email.trim().toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

export default function GateScreen() {
  const { signIn, signInDev } = useAuth();
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const noAccount = params.reason === 'no_account';
  const orderUrl = orderSignupUrl('pro');

  useEffect(() => {
    if (typeof params.email === 'string' && params.email.includes('@')) {
      setEmail(params.email.trim().toLowerCase());
      return;
    }
    if (__DEV__ && hasDevCredentials() && DEV_EMAIL) {
      setEmail(DEV_EMAIL);
    }
    ExpoLinking.getInitialURL().then((url) => {
      if (!url) return;
      const fromUrl = parseEmailFromUrl(url);
      if (fromUrl) setEmail(fromUrl);
    });
  }, [params.email]);

  useEffect(() => {
    if (noAccount) {
      setError('No owner account for this email. Create one on the website, then sign in here.');
    }
  }, [noAccount]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace('/');
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const openOrder = () => {
    if (orderUrl) void Linking.openURL(orderUrl);
  };

  const handleDevSignIn = async () => {
    if (!hasDevCredentials()) {
      setError('Add EXPO_PUBLIC_DEV_EMAIL and EXPO_PUBLIC_DEV_PASSWORD to .env');
      return;
    }
    if (!hasDevBootstrap()) {
      setError('Add EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET to .env');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signInDev(DEV_EMAIL, DEV_PASSWORD, DEV_BOOTSTRAP_SECRET);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  return (
    <Screen
      scroll
      safe
      padded={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.hero}>
        <BrandLogo size={56} />
        <Text variant="caption" muted style={styles.eyebrow}>TapStamp</Text>
        <Text variant="hero" style={styles.heroTitle}>Sign in</Text>
        <Text muted style={styles.heroSub}>
          Manage stamps, customers, and your team.
        </Text>
        <View style={styles.accentLine} />
      </View>

      <View style={styles.formGroup}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Enter your email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="Your password"
          onSubmitEditing={handleSubmit}
        />
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text variant="caption" color={colors.error} style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Button title="Sign in" onPress={handleSubmit} loading={loading} />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgot}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Forgot password?
            </Text>
          </Pressable>
        </Link>
      </View>

      {noAccount && orderUrl ? (
        <Button title="Create account on website" onPress={openOrder} variant="outline" />
      ) : null}

      <Pressable onPress={() => router.push('/(auth)/staff')} style={styles.staffCard}>
        <View style={styles.staffIcon}>
          <Ionicons name="radio-outline" size={20} color={colors.accentDark} />
        </View>
        <View style={styles.staffText}>
          <Text variant="bodySmall" style={styles.staffTitle}>Staff mode</Text>
          <Text variant="caption" muted>Stamp and redeem at the counter</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      {orderUrl ? (
        <Pressable onPress={openOrder} style={styles.orderOnline}>
          <Text variant="bodySmall" color={colors.accentDark}>
            New shop? Order online — £0 today
          </Text>
          <Ionicons name="open-outline" size={16} color={colors.accentDark} />
        </Pressable>
      ) : (
        <Text variant="caption" muted style={styles.help}>
          Need an account? Email {SUPPORT_EMAIL}
        </Text>
      )}

      {__DEV__ && hasDevBootstrap() && hasDevCredentials() ? (
        <Button
          title="Dev sign in"
          variant="outline"
          onPress={handleDevSignIn}
          loading={loading}
          style={styles.devBtn}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
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
    marginBottom: spacing.xs,
  },
  formGroup: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorMuted,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: { flex: 1, lineHeight: 18 },
  forgot: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  staffIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffText: { flex: 1, gap: 2 },
  staffTitle: { fontWeight: '600' },
  help: {
    lineHeight: 20,
    textAlign: 'center',
  },
  orderOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  devBtn: {
    marginTop: spacing.xs,
  },
});
