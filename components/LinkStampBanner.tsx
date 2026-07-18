import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activateStamp } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

type Props = {
  onLinked?: () => void;
};

export function LinkStampBanner({ onLinked }: Props) {
  const { refreshBusiness } = useAuth();
  const alert = useTapStampAlert();
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      alert('Enter stamp code', 'Type the code on your TapStamp or hold it to your phone.');
      return;
    }

    setLinking(true);
    const result = await activateStamp(normalized);
    setLinking(false);

    if (result.error) {
      alert('Could not link stamp', result.error);
      return;
    }

    setCode('');
    await refreshBusiness();
    onLinked?.();
    alert('TapStamp linked', 'Your stamp is connected. Customers can start tapping.');
  };

  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="radio-outline" size={28} color={colors.accentDark} />
      </View>
      <Text variant="h3" style={styles.title}>Link your TapStamp</Text>
      <Text variant="bodySmall" muted style={styles.subtitle}>
        Your account isn&apos;t linked to a stamp yet. Enter your stamp code or hold it to the top of your phone.
      </Text>
      <Input
        label="Stamp code"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="e.g. WQXZ"
        autoCapitalize="characters"
        editable={!linking}
      />
      <Button title="Link stamp" onPress={() => void handleLink()} loading={linking} />
      <Button
        title="Hold stamp to phone"
        variant="outline"
        onPress={() => router.push('/(onboarding)/activate')}
        disabled={linking}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'stretch',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
