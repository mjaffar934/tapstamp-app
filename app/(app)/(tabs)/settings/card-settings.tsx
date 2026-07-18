import { useState, useEffect, useMemo, useCallback } from 'react';
import { Image, Pressable, View, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { uploadCafeLogo } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { resolveCafePassColors } from '@/lib/passTemplates';
import { colors, radius, spacing } from '@/constants/theme';

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number | null): string {
  if (value == null) return '';
  return value.toFixed(2);
}

const SATURDAY_DOUBLE = [{ day: 6, start: '00:00', end: '23:59' }];

interface CardFormState {
  minSpendEnabled: boolean;
  amountText: string;
  showCustomerName: boolean;
  collectDetails: boolean;
  collectNameOnly: boolean;
  collectBirthday: boolean;
  reward: string;
  stampGoal: string;
  cooldownHours: string;
  doubleStampSaturday: boolean;
  welcomeMessage: string;
  stampMessage: string;
  rewardMessage: string;
}

function formFromCafe(cafe: NonNullable<ReturnType<typeof useOwnerCafe>['cafe']>): CardFormState {
  return {
    minSpendEnabled: cafe.minimum_spend != null && cafe.minimum_spend > 0,
    amountText: cafe.minimum_spend ? formatAmount(Number(cafe.minimum_spend)) : '',
    showCustomerName: (cafe.collect_customer_details ?? false) && (cafe.show_customer_name_on_pass ?? true),
    collectDetails: cafe.collect_customer_details ?? false,
    collectNameOnly: cafe.collect_name_only ?? false,
    collectBirthday: cafe.collect_birthday ?? false,
    reward: cafe.reward ?? 'Free coffee',
    stampGoal: String(cafe.stamp_goal ?? 10),
    cooldownHours: cafe.stamp_cooldown_hours ? String(cafe.stamp_cooldown_hours) : '',
    doubleStampSaturday: (cafe.double_stamp_hours?.length ?? 0) > 0,
    welcomeMessage: cafe.welcome_message ?? '',
    stampMessage: cafe.stamp_message ?? '',
    rewardMessage: cafe.reward_message ?? '',
  };
}

export default function CardSettingsScreen() {
  const { business } = useAuth();
  const { cafe, isLoading, isSaving, error, saveMinimumSpend, saveCardPreferences, updateCafe, refetch } =
    useOwnerCafe();
  const alert = useTapStampAlert();
  const [minSpendEnabled, setMinSpendEnabled] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [collectDetails, setCollectDetails] = useState(false);
  const [collectNameOnly, setCollectNameOnly] = useState(false);
  const [collectBirthday, setCollectBirthday] = useState(false);
  const [reward, setReward] = useState('');
  const [stampGoal, setStampGoal] = useState('10');
  const [cooldownHours, setCooldownHours] = useState('');
  const [doubleStampSaturday, setDoubleStampSaturday] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [stampMessage, setStampMessage] = useState('');
  const [rewardMessage, setRewardMessage] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedForm, setSavedForm] = useState<CardFormState | null>(null);

  useEffect(() => {
    if (!cafe) return;
    const form = formFromCafe(cafe);
    setMinSpendEnabled(form.minSpendEnabled);
    setAmountText(form.amountText);
    setShowCustomerName(form.showCustomerName);
    setCollectDetails(form.collectDetails);
    setCollectNameOnly(form.collectNameOnly);
    setCollectBirthday(form.collectBirthday);
    setReward(form.reward);
    setStampGoal(form.stampGoal);
    setCooldownHours(form.cooldownHours);
    setDoubleStampSaturday(form.doubleStampSaturday);
    setWelcomeMessage(form.welcomeMessage);
    setStampMessage(form.stampMessage);
    setRewardMessage(form.rewardMessage);
    setLogoUri(cafe.logo_url);
    setSavedForm(form);
    setSaved(false);
  }, [cafe]);

  const currentForm = useMemo<CardFormState>(
    () => ({
      minSpendEnabled,
      amountText,
      showCustomerName,
      collectDetails,
      collectNameOnly,
      collectBirthday,
      reward,
      stampGoal,
      cooldownHours,
      doubleStampSaturday,
      welcomeMessage,
      stampMessage,
      rewardMessage,
    }),
    [
      minSpendEnabled,
      amountText,
      showCustomerName,
      collectDetails,
      collectNameOnly,
      collectBirthday,
      reward,
      stampGoal,
      cooldownHours,
      doubleStampSaturday,
      welcomeMessage,
      stampMessage,
      rewardMessage,
    ],
  );

  const isDirty = savedForm != null && JSON.stringify(currentForm) !== JSON.stringify(savedForm);

  const handleSave = useCallback(async (): Promise<boolean> => {
    setSaved(false);
    const amount = parseAmount(amountText);
    const spendResult = await saveMinimumSpend(minSpendEnabled, amount);
    if (spendResult.error) return false;

    const prefsResult = await saveCardPreferences({
      show_customer_name_on_pass: collectDetails && showCustomerName,
      collect_customer_details: collectDetails,
      collect_name_only: collectDetails && collectNameOnly,
      collect_birthday: collectDetails && !collectNameOnly && collectBirthday,
    });
    if (prefsResult.error) return false;

    const goal = parseInt(stampGoal, 10);
    const cooldown = parseInt(cooldownHours, 10);
    const rewardResult = await updateCafe({
      reward: reward.trim() || 'Free coffee',
      stamp_goal: goal > 0 ? goal : 10,
      stamp_cooldown_hours: cooldownHours.trim() === '' || !Number.isFinite(cooldown) || cooldown <= 0 ? 0 : cooldown,
      double_stamp_hours: doubleStampSaturday ? SATURDAY_DOUBLE : [],
      welcome_message: welcomeMessage.trim() || null,
      stamp_message: stampMessage.trim() || null,
      reward_message: rewardMessage.trim() || null,
    });
    if (rewardResult.error) return false;

    setSavedForm(currentForm);
    setSaved(true);
    return true;
  }, [
    amountText,
    collectBirthday,
    collectDetails,
    collectNameOnly,
    cooldownHours,
    currentForm,
    doubleStampSaturday,
    minSpendEnabled,
    reward,
    rewardMessage,
    saveCardPreferences,
    saveMinimumSpend,
    showCustomerName,
    stampGoal,
    stampMessage,
    updateCafe,
    welcomeMessage,
  ]);

  const onSaveFromUi = async () => {
    const ok = await handleSave();
    if (ok) {
      alert('Saved', 'Your card settings have been updated.');
    }
  };

  const { confirmLeave } = useUnsavedChangesGuard({
    isDirty,
    onSave: handleSave,
  });

  const pickLogo = async () => {
    if (!cafe?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Permission needed', 'Allow photo access to upload your logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingLogo(true);
    const upload = await uploadCafeLogo(cafe.id, result.assets[0].uri);
    setUploadingLogo(false);

    if (upload.error) {
      alert('Upload failed', upload.error);
      return;
    }

    setLogoUri(upload.url ?? result.assets[0].uri);
    await refetch();
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

  const goalNum = parseInt(stampGoal, 10) || 10;
  const passColors = resolveCafePassColors(cafe);

  return (
    <Screen>
      <BackHeader onBack={() => confirmLeave(() => { if (router.canGoBack()) router.back(); })} />
      <ScreenHeader
        compact
        title="Card settings"
        subtitle="Logo, rewards, stamps, and customer details"
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Link your owner account to finish setup and manage card settings.
          </Text>
        </Card>
      ) : (
        <>
          {isDirty ? (
            <View style={styles.unsavedBanner}>
              <Text variant="caption" color={colors.accentDark}>
                You have unsaved changes — tap Save before leaving
              </Text>
            </View>
          ) : null}

          <ExpandableWalletPreview
            businessName={business?.name ?? cafe.name}
            backgroundColor={passColors.backgroundColor}
            foregroundColor={passColors.foregroundColor}
            labelColor={passColors.labelColor}
            logoUri={logoUri}
            stampGoal={goalNum}
            stampsFilled={Math.min(2, goalNum)}
            reward={reward.trim() || 'Free coffee'}
            showCustomerName={showCustomerName && collectDetails}
            customerName="Alex"
          />

          <Button
            title="Customise pass design"
            variant="outline"
            onPress={() => router.push('/(app)/(tabs)/settings/pass-design')}
            style={{ marginBottom: spacing.md }}
          />

          <Card style={styles.section}>
            <Text variant="h3">Logo</Text>
            <Text variant="caption" muted>Your logo appears on the wallet pass and customer tap page</Text>
            <Pressable onPress={pickLogo} disabled={uploadingLogo}>
              <View style={styles.logoBox}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="contain" />
                ) : (
                  <Text variant="caption" muted>Tap to upload your logo</Text>
                )}
              </View>
            </Pressable>
            {uploadingLogo ? <ActivityIndicator color={colors.accent} /> : null}
          </Card>

          <Card style={styles.section}>
            <Text variant="h3">Reward</Text>
            <Input label="Reward name" value={reward} onChangeText={setReward} placeholder="Free oat latte" />
            <Input
              label="Stamps to earn reward"
              value={stampGoal}
              onChangeText={setStampGoal}
              keyboardType="number-pad"
              placeholder="10"
            />
            <Input
              label="Stamp cooldown (hours)"
              value={cooldownHours}
              onChangeText={setCooldownHours}
              keyboardType="number-pad"
              placeholder="Leave blank for no cooldown"
            />
            <Text variant="caption" muted>
              Customers can collect at most one stamp per day. Extra hours add wait time after that.
            </Text>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Double stamps on Saturday</Text>
                <Text variant="caption" muted>Customers earn 2 stamps per tap on Saturdays</Text>
              </View>
              <Switch
                value={doubleStampSaturday}
                onValueChange={setDoubleStampSaturday}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={doubleStampSaturday ? colors.accent : colors.surface}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Collect customer details</Text>
                <Text variant="caption" muted>Ask customers for details before adding to wallet</Text>
              </View>
              <Switch
                value={collectDetails}
                onValueChange={(value) => {
                  setCollectDetails(value);
                  if (!value) {
                    setShowCustomerName(false);
                    setCollectNameOnly(false);
                    setCollectBirthday(false);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={collectDetails ? colors.accent : colors.surface}
              />
            </View>
            {collectDetails ? (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="h3">Name only</Text>
                  <Text variant="caption" muted>Just ask for first name — no email or birthday</Text>
                </View>
                <Switch
                  value={collectNameOnly}
                  onValueChange={(value) => {
                    setCollectNameOnly(value);
                    if (value) setCollectBirthday(false);
                  }}
                  trackColor={{ false: colors.border, true: colors.accentMuted }}
                  thumbColor={collectNameOnly ? colors.accent : colors.surface}
                />
              </View>
            ) : null}
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Show customer name</Text>
                <Text variant="caption" muted>
                  {collectDetails
                    ? 'Display member name on the wallet pass'
                    : 'Turn on customer details first to show names on passes'}
                </Text>
              </View>
              <Switch
                value={showCustomerName && collectDetails}
                onValueChange={(value) => {
                  if (!collectDetails) return;
                  setShowCustomerName(value);
                }}
                disabled={!collectDetails}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={showCustomerName && collectDetails ? colors.accent : colors.surface}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Collect birthday</Text>
                <Text variant="caption" muted>Ask for birthday on signup for future rewards</Text>
              </View>
              <Switch
                value={collectBirthday}
                onValueChange={setCollectBirthday}
                disabled={!collectDetails || collectNameOnly}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={collectBirthday ? colors.accent : colors.surface}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <Text variant="h3">Pass messages</Text>
            <Input
              label="Welcome message"
              value={welcomeMessage}
              onChangeText={setWelcomeMessage}
              placeholder="Thanks for joining!"
            />
            <Input
              label="Thanks message"
              value={stampMessage}
              onChangeText={setStampMessage}
              placeholder="Thanks for visiting — see you again soon!"
            />
            <Text variant="caption" muted>
              Shown on the thanks page after customers join and add their card to Wallet
            </Text>
            <Input
              label="Reward message"
              value={rewardMessage}
              onChangeText={setRewardMessage}
              placeholder="Enjoy your free drink!"
            />
          </Card>

          <Card style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Minimum spend (staff verified)</Text>
                <Text variant="caption" muted>
                  Staff confirm spend in staff mode before stamping — customers cannot self-report
                </Text>
              </View>
              <Switch
                value={minSpendEnabled}
                onValueChange={setMinSpendEnabled}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={minSpendEnabled ? colors.accent : colors.surface}
              />
            </View>
            {minSpendEnabled ? (
              <Input
                label="Minimum amount (£)"
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="8.50"
              />
            ) : null}
          </Card>

          {error ? <Text variant="caption" color={colors.error}>{error}</Text> : null}
          {saved ? (
            <View style={styles.savedBanner}>
              <Text variant="body" color={colors.success} style={styles.savedText}>
                Settings saved
              </Text>
            </View>
          ) : null}
          <Button title="Save changes" onPress={onSaveFromUi} loading={isSaving} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  unsavedBanner: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  savedBanner: {
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
  },
  savedText: {
    fontWeight: '600',
    fontSize: 16,
  },
  logoBox: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  logoPreview: { width: 200, height: 50 },
});
