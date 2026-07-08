import { useState, useEffect } from 'react';
import { Image, Pressable, View, StyleSheet, Switch, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { uploadCafeLogo } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { TAPSTAMP_BRAND } from '@/constants/tapstampBrand';
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

export default function CardSettingsScreen() {
  const { business } = useAuth();
  const { cafe, isLoading, isSaving, error, saveMinimumSpend, saveCardPreferences, updateCafe, refetch } =
    useOwnerCafe();
  const [minSpendEnabled, setMinSpendEnabled] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [collectDetails, setCollectDetails] = useState(false);
  const [collectBirthday, setCollectBirthday] = useState(false);
  const [reward, setReward] = useState('');
  const [stampGoal, setStampGoal] = useState('10');
  const [cooldownHours, setCooldownHours] = useState('4');
  const [doubleStampSaturday, setDoubleStampSaturday] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [stampMessage, setStampMessage] = useState('');
  const [rewardMessage, setRewardMessage] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cafe) {
      setMinSpendEnabled(cafe.minimum_spend != null && cafe.minimum_spend > 0);
      setAmountText(cafe.minimum_spend ? formatAmount(Number(cafe.minimum_spend)) : '');
      setShowCustomerName(cafe.show_customer_name_on_pass ?? true);
      setCollectDetails(cafe.collect_customer_details ?? false);
      setCollectBirthday(cafe.collect_birthday ?? false);
      setReward(cafe.reward ?? 'Free coffee');
      setStampGoal(String(cafe.stamp_goal ?? 10));
      setCooldownHours(String(cafe.stamp_cooldown_hours ?? 4));
      setDoubleStampSaturday((cafe.double_stamp_hours?.length ?? 0) > 0);
      setWelcomeMessage(cafe.welcome_message ?? '');
      setStampMessage(cafe.stamp_message ?? '');
      setRewardMessage(cafe.reward_message ?? '');
      setLogoUri(cafe.logo_url);
    }
  }, [cafe]);

  const pickLogo = async () => {
    if (!cafe?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload your logo.');
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
      Alert.alert('Upload failed', upload.error);
      return;
    }

    setLogoUri(upload.url ?? result.assets[0].uri);
    await refetch();
  };

  const handleSave = async () => {
    setSaved(false);
    const amount = parseAmount(amountText);
    const spendResult = await saveMinimumSpend(minSpendEnabled, amount);
    if (spendResult.error) return;

    const prefsResult = await saveCardPreferences({
      show_customer_name_on_pass: showCustomerName,
      collect_customer_details: collectDetails,
      collect_birthday: collectBirthday,
    });
    if (prefsResult.error) return;

    const goal = parseInt(stampGoal, 10);
    const cooldown = parseInt(cooldownHours, 10);
    const rewardResult = await updateCafe({
      reward: reward.trim() || 'Free coffee',
      stamp_goal: goal > 0 ? goal : 10,
      stamp_cooldown_hours: cooldown > 0 ? cooldown : 4,
      double_stamp_hours: doubleStampSaturday ? SATURDAY_DOUBLE : [],
      welcome_message: welcomeMessage.trim() || null,
      stamp_message: stampMessage.trim() || null,
      reward_message: rewardMessage.trim() || null,
    });
    if (!rewardResult.error) {
      setSaved(true);
      Alert.alert('Saved', 'Your card settings have been updated.');
    }
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

  return (
    <Screen>
      <BackHeader />
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
          <ExpandableWalletPreview
            businessName={business?.name ?? cafe.name}
            backgroundColor={TAPSTAMP_BRAND.backgroundColor}
            foregroundColor={TAPSTAMP_BRAND.foregroundColor}
            labelColor={TAPSTAMP_BRAND.labelColor}
            logoUri={logoUri}
            stampGoal={goalNum}
            stampsFilled={Math.min(3, goalNum)}
            reward={reward.trim() || 'Free coffee'}
            showCustomerName={showCustomerName}
            customerName="Alex"
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
              placeholder="4"
            />
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
                <Text variant="h3">Show customer name</Text>
                <Text variant="caption" muted>Display member name on the wallet pass header</Text>
              </View>
              <Switch
                value={showCustomerName}
                onValueChange={setShowCustomerName}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={showCustomerName ? colors.accent : colors.surface}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="h3">Collect customer details</Text>
                <Text variant="caption" muted>Ask for name and email before adding to wallet</Text>
              </View>
              <Switch
                value={collectDetails}
                onValueChange={setCollectDetails}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={collectDetails ? colors.accent : colors.surface}
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
              label="Stamp message"
              value={stampMessage}
              onChangeText={setStampMessage}
              placeholder="See you again soon"
            />
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
          {saved ? <Text variant="caption" color={colors.success}>Settings saved</Text> : null}
          <Button title="Save changes" onPress={handleSave} loading={isSaving} />
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
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paletteCard: {
    width: '47%',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  paletteCardActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  paletteSwatches: { flexDirection: 'row', gap: 6 },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
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
