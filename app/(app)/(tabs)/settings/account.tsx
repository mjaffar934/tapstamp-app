import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { supabase } from '@/lib/supabase';
import { PLANS } from '@/constants/plans';
import { parsePlanId } from '@/constants/plans';
import { isTrialActive, trialDaysRemaining } from '@/lib/planUtils';
import { colors, spacing } from '@/constants/theme';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AccountScreen() {
  const { user, business } = useAuth();
  const { cafe } = useOwnerCafe();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const planId = parsePlanId(cafe?.plan ?? business?.plan_selected ?? undefined);
  const plan = PLANS[planId];

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm your new password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      Alert.alert('Could not update password', error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Password updated', 'Your new password is now active.');
  };

  return (
    <Screen>
      <BackHeader />
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
        {isTrialActive(cafe?.trial_ends_at) ? (
          <Text variant="caption" muted style={styles.hint}>
            {trialDaysRemaining(cafe?.trial_ends_at)} days left · trial ends {formatDate(cafe?.trial_ends_at)}
          </Text>
        ) : planId === 'starter' ? (
          <Text variant="caption" muted style={styles.hint}>
            Free · up to 50 customers/month
          </Text>
        ) : (
          <Text variant="caption" muted style={styles.hint}>
            {plan.tagline}
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
