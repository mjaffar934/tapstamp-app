import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

interface RewardTier {
  id: string;
  stamp_count: number;
  reward: string;
}

export default function TiersScreen() {
  const { cafe } = useOwnerCafe();
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stampCount, setStampCount] = useState('');
  const [reward, setReward] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTiers = useCallback(async () => {
    if (!cafe?.id) {
      setTiers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('reward_tiers')
      .select('id, stamp_count, reward')
      .eq('cafe_id', cafe.id)
      .order('stamp_count');

    if (error) {
      Alert.alert('Could not load tiers', error.message);
    } else {
      setTiers((data ?? []) as RewardTier[]);
    }
    setIsLoading(false);
  }, [cafe?.id]);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const addTier = async () => {
    if (!cafe?.id) return;
    const count = parseInt(stampCount, 10);
    if (!count || count < 1 || !reward.trim()) {
      Alert.alert('Invalid tier', 'Enter a stamp count and reward name.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('reward_tiers').insert({
      cafe_id: cafe.id,
      stamp_count: count,
      reward: reward.trim(),
    } as never);

    setSaving(false);
    if (error) {
      Alert.alert('Could not add tier', error.message);
      return;
    }

    setStampCount('');
    setReward('');
    await loadTiers();
  };

  const removeTier = async (id: string) => {
    const { error } = await supabase.from('reward_tiers').delete().eq('id', id);
    if (error) {
      Alert.alert('Could not remove tier', error.message);
      return;
    }
    await loadTiers();
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader />
      <ScreenHeader
        compact
        title="Reward tiers"
        subtitle="Unlock extra rewards at lifetime stamp milestones (shown on wallet passes)."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Link your account to a cafe to manage reward tiers.
          </Text>
        </Card>
      ) : (
        <>
          {tiers.length === 0 ? (
            <Card style={styles.empty}>
              <Text variant="bodySmall" muted>
                No tiers yet. Add VIP milestones like "Free pastry at 25 stamps".
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {tiers.map((tier) => (
                <Card key={tier.id} style={styles.tierRow}>
                  <View style={styles.tierInfo}>
                    <Text variant="bodySmall" style={styles.tierCount}>
                      {tier.stamp_count} stamps
                    </Text>
                    <Text variant="caption" muted>{tier.reward}</Text>
                  </View>
                  <Button
                    title="Remove"
                    variant="ghost"
                    onPress={() => removeTier(tier.id)}
                  />
                </Card>
              ))}
            </View>
          )}

          <Card style={styles.form}>
            <Text variant="h3">Add tier</Text>
            <Input
              label="Lifetime stamps"
              value={stampCount}
              onChangeText={setStampCount}
              keyboardType="number-pad"
              placeholder="25"
            />
            <Input
              label="Reward"
              value={reward}
              onChangeText={setReward}
              placeholder="Free pastry"
            />
            <Button title="Add tier" onPress={addTier} loading={saving} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tierInfo: {
    flex: 1,
    gap: 2,
  },
  tierCount: {
    fontWeight: '600',
  },
  form: {
    gap: spacing.md,
  },
});
