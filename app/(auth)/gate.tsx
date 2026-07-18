import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLinking from 'expo-linking';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { OwnerFlowSteps } from '@/components/auth/OwnerFlowSteps';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORT_EMAIL } from '@/constants/config';
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
  const { signIn, signUp, signInDev } = useAuth();
  const params = useLocalSearchParams<{ email?: string; reason?: string; mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.mode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const noAccount = params.reason === 'no_account';

  useEffect(() => {
    if (typeof params.email === 'string' && params.email.includes('@')) {
      setEmail(params.email.trim().toLowerCase());
      return;
    }
    if (__DEV__ && hasDevCredentials() && DEV_EMAIL && mode === 'signin') {
      setEmail(DEV_EMAIL);
    }
    ExpoLinking.getInitialURL().then((url) => {
      if (!url) return;
      const fromUrl = parseEmailFromUrl(url);
      if (fromUrl) setEmail(fromUrl);
    });
  }, [params.email, mode]);

  useEffect(() => {
    if (noAccount) {
      setError('No account found for this email. Create one below.');
      setMode('signup');
    }
  }, [noAccount]);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = mode === 'signup'
        ? await signUp(email.trim(), password, businessName.trim() || 'My Business', ownerName.trim())
        : await signIn(email.trim(), password);

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
    <Screen scroll safe padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <BrandLogo size={56} />
            <Text variant="caption" muted style={styles.eyebrow}>TapStamp</Text>
            <Text variant="hero" style={styles.heroTitle}>
              {mode === 'signup' ? 'Create your account' : 'Sign in'}
            </Text>
            <Text muted style={styles.heroSub}>
              {mode === 'signup'
                ? 'Digital loyalty for any business — activate with your TapStamp, then set up your card.'
                : 'Manage stamps, customers, and your team.'}
            </Text>
            <View style={styles.accentLine} />
            {mode === 'signup' ? <OwnerFlowSteps current="account" compact /> : null}
          </View>

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
              onPress={() => { setMode('signin'); setError(null); }}
            >
              <Text variant="bodySmall" style={mode === 'signin' ? styles.modeTabTextActive : undefined}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
              onPress={() => { setMode('signup'); setError(null); }}
            >
              <Text variant="bodySmall" style={mode === 'signup' ? styles.modeTabTextActive : undefined}>
                Create account
              </Text>
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            {mode === 'signup' ? (
              <>
                <Input
                  label="Your name"
                  value={ownerName}
                  onChangeText={setOwnerName}
                  autoCapitalize="words"
                  placeholder="Your name"
                />
                <Input
                  label="Business name"
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoCapitalize="words"
                  placeholder="Your business name"
                />
              </>
            ) : null}
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
              autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
              onSubmitEditing={handleSubmit}
            />
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text variant="caption" color={colors.error} style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Button
              title={mode === 'signup' ? 'Continue' : 'Sign in'}
              onPress={handleSubmit}
              loading={loading}
            />
            {mode === 'signin' ? (
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable style={styles.forgot}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    Forgot password?
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/staff')}
            style={styles.staffCard}
          >
            <View style={styles.staffIcon}>
              <Ionicons name="radio-outline" size={20} color={colors.accentDark} />
            </View>
            <View style={styles.staffText}>
              <Text variant="bodySmall" style={styles.staffTitle}>Staff mode</Text>
              <Text variant="caption" muted>Stamp and redeem at the counter</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {mode === 'signup' ? (
            <Text variant="caption" muted style={styles.help}>
              Next: hold your TapStamp to your phone to activate. {SUPPORT_EMAIL}
            </Text>
          ) : null}

          {__DEV__ && hasDevBootstrap() && hasDevCredentials() ? (
            <Button
              title="Dev sign in"
              variant="outline"
              onPress={handleDevSignIn}
              loading={loading}
              style={styles.devBtn}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  modeTabTextActive: {
    fontWeight: '600',
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
  devBtn: {
    marginTop: spacing.xs,
  },
});
