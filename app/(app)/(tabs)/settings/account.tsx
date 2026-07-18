import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { supabase } from '@/lib/supabase';
import { PLANS } from '@/constants/plans';
import { parsePlanId } from '@/constants/plans';
import { colors, spacing } from '@/constants/theme';

export default function AccountScreen() {
  const { user, business } = useAuth();
  const { cafe } = useOwnerCafe();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const alert = useTapStampAlert();

  const planId = parsePlanId(cafe?.plan ?? business?.plan_selected ?? undefined);
  const plan = PLANS[planId];

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match', 'Please confirm your new password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      alert('Could not update password', error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    alert('Password updated', 'Your new password is now active.');
  };

  return (
    <Screen>
      <BackHeader onBack={() => router.replace('/(app)/(tabs)/settings')} />
      <ScreenHeader compact title="Account" subtitle="Email, password, and plan details" />
      <Card style={styles.card}>
        <Text variant="caption" muted>EMAIL</Text>
        <Text variant="body">{user?.email ?? '—'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="caption" muted>BUSINESS</Text>
        <Text variant="body">{business?.name ?? cafe?.name ?? '—'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="caption" muted>PLAN</Text>
        <Text variant="body">{plan.name}</Text>
        {planId === 'starter' ? (
          <Text variant="caption" muted style={styles.hint}>
            Free · up to 50 customers/month
          </Text>
        ) : (
          <Text variant="caption" muted style={styles.hint}>
            {plan.tagline.replace(/trial/gi, '').replace(/after\s+/gi, '').trim() || plan.tagline}
          </Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text variant="h3">Change password</Text>
        <Input
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Min. 8 characters"
        />
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Repeat password"
        />
        <Button title="Update password" onPress={handleChangePassword} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.sm },
  hint: { marginTop: spacing.xs },
});
