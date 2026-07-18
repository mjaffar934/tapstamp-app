import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useTapStampAlert } from '@/contexts/AlertContext';
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

const DEFAULT_LEVELS = [
  { stamp_count: 5, reward: 'Free pastry' },
  { stamp_count: 10, reward: 'Free coffee' },
] as const;

export default function TiersScreen() {
  const { cafe, updateCafe } = useOwnerCafe();
  const alert = useTapStampAlert();
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
      alert('Could not load levels', error.message);
    } else {
      setTiers((data ?? []) as RewardTier[]);
    }
    setIsLoading(false);
  }, [cafe?.id, alert]);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const syncMainReward = async (next: Array<{ stamp_count: number; reward: string }>) => {
    if (!cafe?.id || next.length === 0) return;
    const top = [...next].sort((a, b) => a.stamp_count - b.stamp_count).at(-1)!;
    await updateCafe({
      stamp_goal: top.stamp_count,
      reward: top.reward,
    });
  };

  const addTier = async () => {
    if (!cafe?.id) return;
    const count = parseInt(stampCount, 10);
    if (!count || count < 1 || !reward.trim()) {
      alert('Invalid level', 'Enter a stamp count and reward, like 5 and Free pastry.');
      return;
    }

    if (tiers.some((tier) => tier.stamp_count === count)) {
      alert('Duplicate level', `You already have a reward at ${count} stamps.`);
      return;
    }

    if (tiers.length >= 3) {
      alert('Limit reached', 'Keep it to 2–3 stamp levels.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('reward_tiers').insert({
      cafe_id: cafe.id,
      stamp_count: count,
      reward: reward.trim(),
    } as never);

    if (error) {
      setSaving(false);
      alert('Could not add level', error.message);
      return;
    }

    const next = [...tiers, { id: 'tmp', stamp_count: count, reward: reward.trim() }];
    await syncMainReward(next);
    setSaving(false);
    setStampCount('');
    setReward('');
    await loadTiers();
  };

  const seedDefaults = async () => {
    if (!cafe?.id) return;
    setSaving(true);
    await supabase.from('reward_tiers').delete().eq('cafe_id', cafe.id);
    const { error } = await supabase.from('reward_tiers').insert(
      DEFAULT_LEVELS.map((level) => ({
        cafe_id: cafe.id,
        stamp_count: level.stamp_count,
        reward: level.reward,
      })) as never,
    );
    if (error) {
      setSaving(false);
      alert('Could not add levels', error.message);
      return;
    }
    await syncMainReward([...DEFAULT_LEVELS]);
    setSaving(false);
    await loadTiers();
  };

  const removeTier = async (id: string) => {
    const { error } = await supabase.from('reward_tiers').delete().eq('id', id);
    if (error) {
      alert('Could not remove level', error.message);
      return;
    }
    const next = tiers.filter((t) => t.id !== id);
    if (next.length) await syncMainReward(next);
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
        title="Stamp levels"
        subtitle="Optional: 5 = pastry, 10 = coffee. Leave empty for a simple stamp card."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Link your account to a cafe to manage stamp levels.
          </Text>
        </Card>
      ) : (
        <>
          <Card style={styles.infoCard}>
            <Text variant="bodySmall" muted>
              Two programme types only: a simple stamp card, or stamp levels like these.
            </Text>
          </Card>

          {tiers.length === 0 ? (
            <Card style={styles.empty}>
              <Text variant="bodySmall" muted style={{ marginBottom: spacing.sm }}>
                No levels yet — customers use your simple stamp card. Or add levels in one tap:
              </Text>
              <Button title="Add 5 = pastry · 10 = coffee" onPress={seedDefaults} loading={saving} />
            </Card>
          ) : (
            <View style={styles.list}>
              {tiers.map((tier) => (
                <Card key={tier.id} style={styles.tierRow}>
                  <View style={styles.tierText}>
                    <Text variant="bodySmall" style={styles.strong}>
                      {tier.stamp_count} stamps = {tier.reward}
                    </Text>
                  </View>
                  <Button title="Remove" variant="ghost" onPress={() => void removeTier(tier.id)} />
                </Card>
              ))}
              {tiers.length < 3 ? (
                <Card style={styles.form}>
                  <Input
                    label="Stamps"
                    value={stampCount}
                    onChangeText={setStampCount}
                    keyboardType="number-pad"
                    placeholder="15"
                  />
                  <Input
                    label="Reward"
                    value={reward}
                    onChangeText={setReward}
                    placeholder="VIP treat"
                  />
                  <Button title="Add level" onPress={() => void addTier()} loading={saving} />
                </Card>
              ) : null}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: { marginBottom: spacing.md },
  empty: { gap: spacing.sm },
  list: { gap: spacing.sm, marginBottom: spacing.xl },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierText: { flex: 1 },
  strong: { fontFamily: 'Inter_600SemiBold' },
  form: { gap: spacing.sm, marginTop: spacing.sm },
});
