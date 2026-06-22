import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { useStaff } from '@/contexts/StaffContext';
import { colors, spacing } from '@/constants/theme';

export default function StaffLoginScreen() {
  const { signInWithCode } = useStaff();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError(null);
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
    <Screen scroll={false} safe>
      <BackHeader />
      <Text variant="h1" style={styles.title}>Staff mode</Text>
      <Text muted style={styles.subtitle}>
        Enter the staff code from your owner&apos;s Settings screen to open barista mode.
      </Text>

      <View style={styles.form}>
        <Input
          label="Staff code"
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          autoCapitalize="characters"
          placeholder="ABC123"
        />
        {error ? <Text variant="caption" color={colors.error}>{error}</Text> : null}
        <Button title="Enter barista mode" onPress={handleJoin} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.xl, maxWidth: 320 },
  form: { gap: spacing.md },
});
