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

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(app)/(tabs)/home');
  };

  return (
    <Screen>
      <BackHeader onBack={() => router.replace('/(auth)/gate')} />
      <View style={styles.header}>
        <Text variant="h1">Set new password</Text>
        <Text muted>Choose a new password for your TapStamp owner account.</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min. 8 characters"
        />
        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Repeat password"
        />
        {error ? (
          <Text variant="caption" color={colors.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Update password" onPress={handleUpdate} loading={loading} />
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
  form: {
    gap: spacing.md,
  },
});
