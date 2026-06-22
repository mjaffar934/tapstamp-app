import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { orderSignupUrl } from '@/constants/config';
import {
  DEV_BOOTSTRAP_SECRET,
  DEV_EMAIL,
  DEV_PASSWORD,
  DEV_SIGN_IN_ENABLED,
  hasDevBootstrap,
  hasDevCredentials,
} from '@/constants/devAuth';
import { colors, radius, spacing } from '@/constants/theme';

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
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof params.email === 'string' && params.email.includes('@')) {
      setEmail(params.email.trim().toLowerCase());
      return;
    }
    ExpoLinking.getInitialURL().then((url) => {
      if (!url) return;
      const fromUrl = parseEmailFromUrl(url);
      if (fromUrl) setEmail(fromUrl);
    });
  }, [params.email]);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/');
  };

  const handleDevSignIn = async () => {
    if (!hasDevCredentials()) {
      setError('Add EXPO_PUBLIC_DEV_EMAIL and EXPO_PUBLIC_DEV_PASSWORD to .env');
      return;
    }
    if (!hasDevBootstrap()) {
      setError('Add EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET to .env (must match Supabase DEV_BOOTSTRAP_SECRET)');
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

  const openOrder = () => {
    const url = orderSignupUrl('starter');
    if (url) {
      void Linking.openURL(url);
    }
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
          <View style={styles.top}>
            <BrandLogo size={56} />
            <Text style={styles.wordmark}>TapStamp</Text>
            <View style={styles.rule} />
            <Text style={styles.headline}>Owner sign in</Text>
            <Text muted style={styles.subline}>
              Use the same email and password you created when ordering on tapstamp.co.
            </Text>
          </View>

          <Card style={styles.signInCard}>
            <Text variant="h3">Sign in</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@cafe.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              onSubmitEditing={handleSignIn}
            />
            {error ? (
              <Text variant="caption" color={colors.error} style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button title="Sign in" onPress={handleSignIn} loading={loading} style={styles.signInBtn} />
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgot}>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>
          </Card>

          <Card style={styles.orderCard}>
            <Text variant="h3">New to TapStamp?</Text>
            <Text variant="bodySmall" muted>
              Order your £35 loyalty stamp on tapstamp.co — you will create your owner account there, then sign in here to track delivery and go live.
            </Text>
            <Button title="Order your stamp" variant="secondary" onPress={openOrder} />
          </Card>

          <View style={styles.bottom}>
            <Pressable onPress={() => router.push('/(auth)/staff')} style={styles.staff}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                Staff / barista mode →
              </Text>
            </Pressable>

            {DEV_SIGN_IN_ENABLED ? (
              <>
                <Button
                  title="Dev sign in"
                  variant="outline"
                  onPress={handleDevSignIn}
                  loading={loading}
                />
                <Pressable
                  onPress={() => router.push('/(onboarding)/welcome')}
                  style={styles.devLink}
                >
                  <Text variant="caption" color={colors.accentDark}>
                    Preview onboarding
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
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
  top: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  wordmark: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  rule: {
    width: 32,
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.5,
    marginTop: spacing.xs,
  },
  headline: {
    fontSize: 32,
    fontFamily: 'Inter_400Regular',
    letterSpacing: -0.8,
    lineHeight: 38,
    color: colors.text,
    marginTop: spacing.sm,
  },
  subline: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
  },
  signInCard: {
    gap: spacing.md,
  },
  orderCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
  },
  error: {
    marginTop: -spacing.xs,
  },
  signInBtn: {
    borderRadius: radius.lg,
  },
  forgot: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  bottom: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  staff: {
    paddingVertical: spacing.sm,
  },
  devLink: {
    paddingVertical: spacing.xs,
  },
});
