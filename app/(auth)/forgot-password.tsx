import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { colors, spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'tapstamp://reset-password',
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Check your inbox for a reset link.');
  };

  return (
    <Screen>
      <BackHeader />
      <View style={styles.header}>
        <Text variant="h1" style={styles.title}>
          Reset password
        </Text>
        <Text muted>
          Enter the email linked to your TapStamp owner account.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@cafe.com"
        />
        {error ? (
          <Text variant="caption" color={colors.error}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text variant="caption" color={colors.success}>
            {message}
          </Text>
        ) : null}
        <Button title="Send reset link" onPress={handleReset} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
});
