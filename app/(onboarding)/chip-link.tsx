import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { finalizeOnboarding, uploadCafeLogo } from '@/lib/api';
import { subscribeToDeepLinks } from '@/lib/authLinking';
import { clearOnboardingDraft, loadOnboardingDraft } from '@/lib/onboardingDraft';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { colors, radius, spacing } from '@/constants/theme';

type LinkState = 'idle' | 'ready' | 'linked';

export default function ChipLinkScreen() {
  const { business, refreshBusiness } = useAuth();
  const [state, setState] = useState<LinkState>('idle');
  const [loading, setLoading] = useState(false);
  const [chipCode, setChipCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    return subscribeToDeepLinks({
      onRecovery: () => router.push('/(auth)/reset-password'),
      onChipCode: (code) => {
        setChipCode(code);
        setState('linked');
      },
    });
  }, []);

  const finishLink = async () => {
    const code = chipCode.trim().toUpperCase();
    if (!code) {
      Alert.alert(
        'Place your stamp',
        'Hold your TapStamp under the top of your phone until it connects.',
      );
      return;
    }

    setLoading(true);
    const draft = await loadOnboardingDraft();

    const result = await finalizeOnboarding({
      name: business?.name,
      biz_type: draft.bizType,
      background_color: draft.backgroundColor,
      foreground_color: draft.foregroundColor,
      label_color: draft.labelColor,
      show_customer_name_on_pass: true,
      reward: draft.reward.trim() || 'Free coffee',
      stamp_goal: draft.stampGoal > 0 ? draft.stampGoal : 10,
      minimum_spend:
        draft.minimumSpendEnabled && draft.minimumSpend != null && draft.minimumSpend > 0
          ? draft.minimumSpend
          : null,
      chip_code: code,
    });

    if (result.error) {
      setLoading(false);
      setShowManual(true);
      Alert.alert('Could not link', result.error);
      return;
    }

    if (result.cafeId && draft.logoUri) {
      await uploadCafeLogo(result.cafeId, draft.logoUri).catch(() => undefined);
    }

    await clearOnboardingDraft();
    await refreshBusiness();
    setLoading(false);
    router.replace('/(onboarding)/done');
  };

  const onPrimaryPress = () => {
    if (state === 'idle') {
      setState('ready');
      return;
    }
    if (state === 'ready' && !chipCode) {
      setShowManual(true);
      Alert.alert(
        'No stamp detected',
        'Enter the reference printed on the back of your stamp, or hold it under the top of your phone again.',
      );
      return;
    }
    if (state === 'ready' && chipCode) {
      setState('linked');
      return;
    }
    finishLink();
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={7}
        title="Link your stamp"
        subtitle="Place your TapStamp under the top of your phone. We'll connect it to your loyalty card."
      />

      <Pressable
        style={[styles.phoneZone, state !== 'idle' && styles.phoneZoneActive]}
        onPress={() => state === 'idle' && setState('ready')}
      >
        <View style={styles.phoneFrame}>
          <View style={[styles.nfcZone, state === 'linked' && styles.nfcZoneLinked]}>
            <Ionicons
              name={state === 'linked' ? 'checkmark-circle' : 'phone-portrait-outline'}
              size={40}
              color={state === 'linked' ? colors.success : colors.accent}
            />
          </View>
          <View style={styles.phoneBody} />
        </View>

        <Text variant="h3" style={styles.tapTitle}>
          {state === 'linked'
            ? 'Stamp connected'
            : state === 'ready'
              ? 'Hold your stamp here'
              : 'Tap to begin'}
        </Text>
        <Text variant="bodySmall" muted style={styles.tapHint}>
          {state === 'linked'
            ? 'Your stamp is ready. Tap below to finish setup.'
            : state === 'ready'
              ? 'Place your TapStamp under the top edge of your phone and hold for a moment.'
              : 'When you are ready, tap here and place your stamp underneath your phone.'}
        </Text>
      </Pressable>

      {(showManual || __DEV__) && (
        <View style={styles.manual}>
          <Input
            label="Reference on stamp"
            value={chipCode}
            onChangeText={(t) => {
              const v = t.toUpperCase();
              setChipCode(v);
              if (v.trim()) setState('linked');
            }}
            autoCapitalize="characters"
            placeholder="Printed on your stamp"
          />
        </View>
      )}

      <Button
        title={
          state === 'linked'
            ? 'Finish setup'
            : state === 'ready'
              ? 'I placed my stamp'
              : 'Begin'
        }
        onPress={onPrimaryPress}
        loading={loading}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  phoneZone: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  phoneZoneActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  phoneFrame: { alignItems: 'center', marginBottom: spacing.lg },
  nfcZone: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  nfcZoneLinked: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  phoneBody: {
    width: 120,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  tapTitle: { textAlign: 'center' },
  tapHint: { textAlign: 'center', maxWidth: 300, marginTop: spacing.sm, lineHeight: 22 },
  manual: { marginBottom: spacing.md },
  cta: { marginTop: spacing.sm },
});
