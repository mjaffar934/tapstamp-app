import { useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/contexts/StaffContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useBaristaData } from '@/hooks/useBaristaData';
import { usePassQrScanner } from '@/hooks/usePassQrScanner';
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

function needsRedeem(pass: BaristaPass): boolean {
  return pass.status === 'redeemed' || Boolean(pass.pending_milestone_reward?.trim());
}

function redeemLabel(pass: BaristaPass): string {
  if (pass.pending_milestone_reward?.trim()) {
    return `Redeem ${pass.pending_milestone_reward.trim()}`;
  }
  return 'Redeem reward';
}

interface BaristaModeProps {
  staffMode?: boolean;
}

export default function BaristaMode({ staffMode = false }: BaristaModeProps) {
  const { user, business } = useAuth();
  const { staffSession, signOutStaff } = useStaff();
  const { cafe, isLoading: cafeLoading } = useOwnerCafe();
  const cafeId = staffMode ? staffSession?.cafeId : cafe?.id;
  const { data, isLoading, error, refetch } = useBaristaData(cafeId);
  const [selected, setSelected] = useState<BaristaPass | null>(null);
  const [selectedExpanded, setSelectedExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [acting, setActing] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const alert = useTapStampAlert();

  const minSpend = data?.minimumSpend != null ? Number(data.minimumSpend) : 0;

  const loading = (!staffMode && cafeLoading) || isLoading;

  const { openScanner } = usePassQrScanner({
    onSerial: (serial) => {
      const match = (data?.passes ?? []).find(
        (p) => p.serial_number.toLowerCase() === serial.toLowerCase(),
      );
      if (match) {
        setSelected(match);
        setSelectedExpanded(true);
        setSpendAmount('');
        return;
      }
      alert(
        'Pass not in recent list',
        'Ask the customer to tap your stamp once, or search by their member code.',
      );
    },
    onMemberCode: (code) => {
      const match = (data?.passes ?? []).find(
        (p) => (p.member_code ?? '').toLowerCase() === code.toLowerCase(),
      );
      if (match) {
        setSelected(match);
        setSelectedExpanded(true);
        setSpendAmount('');
        return;
      }
      alert('Member not found', `No customer with code ${code} in recent passes.`);
    },
  });

  const filteredPasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const passes = data?.passes ?? [];
    if (!q) return passes;
    return passes.filter((pass) => {
      const name = displayName(pass).toLowerCase();
      const code = pass.member_code?.toLowerCase() ?? '';
      return name.includes(q) || code.includes(q);
    });
  }, [data?.passes, query]);

  const handleAction = async (action: 'stamp' | 'redeem') => {
    if (!selected) {
      alert('Select a customer', 'Search by name or pick from recent passes.');
      return;
    }

    let verifiedSpend: number | undefined;
    if (action === 'stamp' && minSpend > 0) {
      const parsed = parseFloat(spendAmount.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        alert('Enter purchase amount', `Type what the customer spent at the till (minimum ${formatPounds(minSpend)}).`);
        return;
      }
      if (parsed < minSpend) {
        alert('Below minimum', `Spend must be at least ${formatPounds(minSpend)} to stamp.`);
        return;
      }
      verifiedSpend = parsed;
    }

    setActing(true);
    const result = await callBaristaAction(
      selected.serial_number,
      action,
      staffMode ? staffSession?.staffCode : undefined,
      verifiedSpend,
    );
    setActing(false);

    if (result.error) {
      const message =
        result.error === 'cooldown'
          ? 'Stamped recently — try again later.'
          : result.error === 'not_ready'
            ? 'Reward is not ready yet.'
          : result.error === 'below_minimum'
            ? `Spend must be at least ${formatPounds(result.minimumSpend ?? minSpend)}.`
          : result.error === 'verified_spend required'
            ? 'Enter the purchase amount before stamping.'
            : result.error;
      alert('Could not complete', message);
      return;
    }

    await refetch();
    setSelected(null);
    setSelectedExpanded(false);
    setSpendAmount('');
    alert(
      action === 'stamp' ? 'Stamp added' : 'Reward redeemed',
      action === 'stamp'
        ? `Now at ${result.stampCount ?? 0} stamps.`
        : result.continued
          ? `Still at ${result.stampCount ?? 0} stamps — next tap continues the card.`
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
    setSpendAmount('');
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

      <Button
        title="Scan wallet pass"
        variant="outline"
        icon={<Ionicons name="qr-code-outline" size={18} color={colors.accentDark} />}
        onPress={openScanner}
        style={styles.scanBtn}
      />

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
                      {selected.member_code ? `#${selected.member_code} · ` : ''}
                      {selected.stamp_count} / {data?.stampGoal ?? 10} stamps
                      {needsRedeem(selected) ? ' · Ready to redeem' : ''}
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
              placeholder="Search by name or 4-digit code…"
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
                      {pass.member_code ? `#${pass.member_code} · ` : ''}
                      {pass.stamp_count} / {data?.stampGoal ?? 10} stamps
                      {needsRedeem(pass) ? ' · Ready to redeem' : ''}
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

          {selected && minSpend > 0 ? (
            <Card style={styles.spendCard}>
              <Text variant="caption" muted>VERIFY PURCHASE</Text>
              <Text variant="bodySmall" muted style={styles.spendHint}>
                Enter the amount rung up at the till (minimum {formatPounds(minSpend)}).
              </Text>
              <Input
                label="Amount spent (£)"
                value={spendAmount}
                onChangeText={setSpendAmount}
                keyboardType="decimal-pad"
                placeholder={minSpend.toFixed(2)}
              />
            </Card>
          ) : null}

          <View style={styles.actions}>
            <Button
              title="Add stamp"
              style={styles.actionBtn}
              onPress={() => handleAction('stamp')}
              loading={acting}
              disabled={acting || !selected || Boolean(selected && needsRedeem(selected))}
            />
            <Button
              title={selected ? redeemLabel(selected) : 'Redeem reward'}
              variant="outline"
              style={styles.actionBtn}
              onPress={() => handleAction('redeem')}
              loading={acting}
              disabled={acting || !selected || Boolean(selected && !needsRedeem(selected))}
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
  scanBtn: { marginBottom: spacing.md },
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
  spendCard: { gap: spacing.sm, marginBottom: spacing.md },
  spendHint: { marginBottom: spacing.xs },
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
