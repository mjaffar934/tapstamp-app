import { useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/contexts/StaffContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useCafeSettings } from '@/hooks/useCafeSettings';
import { useBaristaData } from '@/hooks/useBaristaData';
import { callBaristaAction } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { colors, radius, spacing } from '@/constants/theme';
import type { BaristaPass } from '@/hooks/useBaristaData';

function formatPounds(amount: number): string {
  return `£${amount.toFixed(2).replace(/\.00$/, '')}`;
}

function displayName(pass: BaristaPass): string {
  if (pass.customer_name?.trim()) return pass.customer_name.trim();
  return 'Member';
}

interface BaristaModeProps {
  staffMode?: boolean;
}

export default function BaristaMode({ staffMode = false }: BaristaModeProps) {
  const { user, business } = useAuth();
  const { staffSession, signOutStaff } = useStaff();
  const ownerCafe = useOwnerCafe();
  const staffCafe = useCafeSettings(undefined);
  const { cafe, isLoading: cafeLoading } = staffMode ? staffCafe : ownerCafe;
  const cafeId = staffMode ? staffSession?.cafeId : cafe?.id;
  const { data, isLoading, error, refetch } = useBaristaData(cafeId);
  const [selected, setSelected] = useState<BaristaPass | null>(null);
  const [selectedExpanded, setSelectedExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [acting, setActing] = useState(false);

  const loading = (!staffMode && cafeLoading) || isLoading;

  const filteredPasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const passes = data?.passes ?? [];
    if (!q) return passes;
    return passes.filter((pass) => {
      const name = displayName(pass).toLowerCase();
      return name.includes(q);
    });
  }, [data?.passes, query]);

  const confirmMinimumSpend = (): Promise<boolean> => {
    const min = data?.minimumSpend != null ? Number(data.minimumSpend) : 0;
    if (min <= 0) return Promise.resolve(true);

    return new Promise((resolve) => {
      Alert.alert(
        'Confirm minimum spend',
        `Did this customer spend at least ${formatPounds(min)}? Only stamp if you verified at the till.`,
        [
          { text: 'Not yet', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Yes, stamp', onPress: () => resolve(true) },
        ],
      );
    });
  };

  const handleAction = async (action: 'stamp' | 'redeem') => {
    if (!selected) {
      Alert.alert('Select a customer', 'Search by name or pick from recent passes.');
      return;
    }

    if (action === 'stamp') {
      const ok = await confirmMinimumSpend();
      if (!ok) return;
    }

    setActing(true);
    const result = await callBaristaAction(
      selected.serial_number,
      action,
      staffMode ? staffSession?.staffCode : undefined,
    );
    setActing(false);

    if (result.error) {
      const message =
        result.error === 'cooldown'
          ? 'Stamped recently — try again later.'
          : result.error === 'not_ready'
            ? 'Reward is not ready yet.'
            : result.error;
      Alert.alert('Could not complete', message);
      return;
    }

    await refetch();
    setSelected(null);
    setSelectedExpanded(false);
    Alert.alert(
      action === 'stamp' ? 'Stamp added' : 'Reward redeemed',
      action === 'stamp'
        ? `Now at ${result.stampCount ?? 0} stamps.`
        : 'Pass reset for a new cycle.',
    );
  };

  const handleStaffSignOut = async () => {
    await signOutStaff();
  };

  const selectPass = (pass: BaristaPass) => {
    if (selected?.id === pass.id) {
      setSelectedExpanded((v) => !v);
      return;
    }
    setSelected(pass);
    setSelectedExpanded(false);
  };

  const ownerEmail = user?.email ?? business?.email ?? 'this account';
  const businessLabel = staffMode
    ? (staffSession?.cafeName ?? 'Your business')
    : (cafe?.name ?? business?.name ?? 'Your business');

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      {staffMode ? <BackHeader onBack={handleStaffSignOut} title="Staff" /> : null}

      <ScreenHeader
        title="Staff mode"
        subtitle={`${businessLabel} — stamp or redeem at the counter`}
      />

      {!staffMode && !cafeLoading && !cafe ? (
        <Card style={styles.notice}>
          <Text variant="bodySmall" muted>
            No programme linked to {ownerEmail}. Complete setup or check your account email.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.nfcCard}>
        <View style={styles.nfcIcon}>
          <Ionicons name="radio-outline" size={24} color={colors.accentDark} />
        </View>
        <View style={styles.nfcText}>
          <Text variant="bodySmall" style={styles.nfcTitle}>Customer taps your TapStamp</Text>
          <Text variant="caption" muted>
            Most stamps happen automatically when customers tap your stamp on their phone. Use this screen to stamp or redeem manually.
          </Text>
        </View>
      </Card>

      {data?.minimumSpend != null && Number(data.minimumSpend) > 0 ? (
        <Card style={styles.minSpendBanner}>
          <Ionicons name="cash-outline" size={22} color={colors.accentDark} />
          <View style={styles.minSpendText}>
            <Text variant="bodySmall" style={styles.minSpendTitle}>
              Minimum spend: {formatPounds(Number(data.minimumSpend))}
            </Text>
            <Text variant="caption" muted>
              Verify at the till before stamping
            </Text>
          </View>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <Card>
          <Text variant="bodySmall" muted>{error}</Text>
        </Card>
      ) : (
        <>
          <View style={styles.stats}>
            <Card style={styles.stat}>
              <Text variant="h2">{data?.stampsToday ?? 0}</Text>
              <Text variant="caption" muted>Stamps today</Text>
            </Card>
            <Card style={styles.stat}>
              <Text variant="h2">{data?.rewardReady ?? 0}</Text>
              <Text variant="caption" muted>Ready to redeem</Text>
            </Card>
          </View>

          {selected ? (
            <Pressable onPress={() => setSelectedExpanded((v) => !v)}>
              <Card style={styles.selectedCard}>
                <View style={styles.selectedHeader}>
                  <View style={styles.selectedInfo}>
                    <Text variant="caption" muted>SELECTED</Text>
                    <Text variant="bodySmall" style={styles.passName}>
                      {displayName(selected)}
                    </Text>
                  </View>
                  <Ionicons
                    name={selectedExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
                {selectedExpanded ? (
                  <View style={styles.selectedDetails}>
                    <Text variant="caption" muted>
                      {selected.stamp_count} / {data?.stampGoal ?? 10} stamps
                      {selected.status === 'redeemed' ? ' · Ready to redeem' : ''}
                    </Text>
                    <Button
                      title="Clear selection"
                      variant="ghost"
                      onPress={() => {
                        setSelected(null);
                        setSelectedExpanded(false);
                      }}
                    />
                  </View>
                ) : null}
              </Card>
            </Pressable>
          ) : null}

          <Card style={styles.passList} padded={false}>
            <Text variant="h3" style={styles.listTitle}>Recent customers</Text>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name…"
              style={styles.searchInput}
            />
            {filteredPasses.length === 0 ? (
              <View style={styles.emptyList}>
                <Text variant="bodySmall" muted>
                  {query
                    ? 'No customers match your search.'
                    : 'No customers yet. They appear after their first tap.'}
                </Text>
              </View>
            ) : (
              filteredPasses.map((pass) => {
                const isSelected = selected?.id === pass.id;
                return (
                  <Pressable
                    key={pass.id}
                    onPress={() => selectPass(pass)}
                    style={[styles.passRow, isSelected && styles.passRowSelected]}
                  >
                    <View style={styles.passInfo}>
                      <Text variant="bodySmall" style={styles.passName}>
                        {displayName(pass)}
                      </Text>
                      <Text variant="caption" muted>
                        {pass.stamp_count} / {data?.stampGoal ?? 10} stamps
                        {pass.status === 'redeemed' ? ' · Ready to redeem' : ''}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })
            )}
          </Card>

          <View style={styles.actions}>
            <Button
              title="Add stamp"
              style={styles.actionBtn}
              onPress={() => handleAction('stamp')}
              loading={acting}
              disabled={acting || !selected || selected?.status === 'redeemed'}
            />
            <Button
              title="Redeem reward"
              variant="outline"
              style={styles.actionBtn}
              onPress={() => handleAction('redeem')}
              loading={acting}
              disabled={acting || !selected || selected?.status !== 'redeemed'}
            />
          </View>

          {staffMode ? (
            <Button title="Exit staff mode" variant="ghost" onPress={handleStaffSignOut} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: spacing.sm },
  nfcCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  nfcIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcText: { flex: 1, gap: 4 },
  nfcTitle: { fontWeight: '600', color: colors.accentDark },
  minSpendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    marginBottom: spacing.sm,
  },
  minSpendText: { flex: 1, gap: 2 },
  minSpendTitle: { fontWeight: '600', color: colors.accentDark },
  centered: { padding: spacing.xl, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  selectedCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.accentMuted,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectedInfo: { flex: 1, gap: 2 },
  selectedDetails: { gap: spacing.xs },
  passList: { marginBottom: spacing.md },
  listTitle: { padding: spacing.md, paddingBottom: spacing.sm },
  searchInput: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  emptyList: { padding: spacing.md, paddingTop: 0 },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  passRowSelected: { backgroundColor: colors.surfaceElevated },
  passInfo: { flex: 1, gap: 2 },
  passName: { fontWeight: '600' },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { minHeight: 52 },
});
