import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { adminCreateClient } from '@/lib/api';
import { ADMIN_PLAN_OPTIONS, ADMIN_SECRET, planLabel } from '@/constants/adminAuth';
import { PLANS, type PlanId } from '@/constants/plans';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/constants/theme';

export default function CreateClientScreen() {
  const { user } = useAuth();
  const { refetch } = useOwnerCafe();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [plan, setPlan] = useState<PlanId>('starter');
  const alert = useTapStampAlert();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ADMIN_SECRET) {
      alert('Not configured', 'Add EXPO_PUBLIC_ADMIN_SECRET to .env (must match Supabase ADMIN_SECRET).');
      return;
    }
    if (!email.trim() || !password || password.length < 8) {
      alert('Missing details', 'Email and password (min 8 characters) are required.');
      return;
    }
    if (!businessName.trim()) {
      alert('Missing details', 'Business name is required.');
      return;
    }

    setLoading(true);
    const result = await adminCreateClient({
      email: email.trim().toLowerCase(),
      password,
      business_name: businessName.trim(),
      owner_name: ownerName.trim() || undefined,
      plan,
      secret: ADMIN_SECRET,
    });
    setLoading(false);

    if (result.error) {
      alert('Could not create client', result.error);
      return;
    }

    await refetch();

    alert(
      result.updated ? 'Client updated' : 'Client created',
      `${businessName.trim()} can sign in as ${email.trim().toLowerCase()}.\n\nPlan: ${planLabel(plan)}\n\nThey activate by tapping their TapStamp, then finish card setup in the app.`,
      [{ text: 'Done', onPress: () => router.back() }],
    );
  };

  return (
    <Screen>
      <BackHeader />
      <ScreenHeader
        compact
        title="Create client"
        subtitle={`Signed in as ${user?.email ?? 'admin'}`}
      />

      <Card style={styles.card}>
        <Text variant="bodySmall" muted>
          Creates their sign-in and business record. They sign in and activate with their TapStamp, then complete card setup with you.
        </Text>
      </Card>

      <Card style={styles.form}>
        <Input
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Bloom & Co."
        />
        <Input
          label="Owner name (optional)"
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Alex"
        />
        <Input
          label="Sign-in email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="owner@business.com"
        />
        <Input
          label="Temporary password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min. 8 characters"
        />

        <Text variant="label" style={styles.planLabel}>Plan</Text>
        <View style={styles.planRow}>
          {ADMIN_PLAN_OPTIONS.map((id) => {
            const active = plan === id;
            return (
              <Pressable
                key={id}
                style={[styles.planChip, active && styles.planChipActive]}
                onPress={() => setPlan(id)}
              >
                <Text variant="label" color={active ? colors.text : colors.textSecondary}>
                  {PLANS[id].name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button title="Create client account" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  form: { gap: spacing.md, marginBottom: spacing.xl },
  planLabel: { marginTop: spacing.xs },
  planRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planChipActive: {
    borderColor: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
});
