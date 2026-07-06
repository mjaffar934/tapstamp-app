import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToDeepLinks } from '@/lib/authLinking';
import { activateStamp } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { OwnerFlowSteps } from '@/components/auth/OwnerFlowSteps';
import { colors, radius, spacing } from '@/constants/theme';

type ActivateState = 'idle' | 'listening' | 'activating' | 'done';

export default function ActivateScreen() {
  const { signOut, refreshBusiness } = useAuth();
  const [state, setState] = useState<ActivateState>('idle');
  const activatingRef = useRef(false);

  const runActivation = async (code: string) => {
    if (activatingRef.current) return;
    activatingRef.current = true;
    setState('activating');

    const result = await activateStamp(code);
    if (result.error) {
      activatingRef.current = false;
      setState('listening');
      Alert.alert('Could not activate', result.error);
      return;
    }

    await refreshBusiness();
    setState('done');
    router.replace('/(onboarding)/welcome');
  };

  useEffect(() => {
    return subscribeToDeepLinks({
      onRecovery: () => router.push('/(auth)/reset-password'),
      onChipCode: (code) => {
        setState('listening');
        void runActivation(code);
      },
    });
  }, []);

  const startListening = () => {
    setState('listening');
  };

  const onPrimaryPress = () => {
    if (state === 'idle') {
      startListening();
      return;
    }
    if (state === 'listening') {
      Alert.alert(
        'Hold your TapStamp to your phone',
        'Place the stamp flat under the top edge of your iPhone for a few seconds. When it connects, your account activates automatically.',
      );
    }
  };

  const busy = state === 'activating' || state === 'done';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={() => void signOut()} hitSlop={12}>
          <Text variant="bodySmall" color={colors.textSecondary}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <OwnerFlowSteps current="activate" />
        <Text variant="caption" style={styles.eyebrow}>Step 2 · Activate</Text>
        <Text variant="hero" style={styles.title}>Activate with your TapStamp</Text>
        <Text muted style={styles.subtitle}>
          Hold the TapStamp we gave you to the top of your phone. That links your account and starts your 14-day trial.
        </Text>
      </View>

      <Pressable
        style={[styles.phoneZone, state !== 'idle' && styles.phoneZoneActive]}
        onPress={() => state === 'idle' && startListening()}
        disabled={busy}
      >
        <View style={styles.phoneFrame}>
          <View style={[styles.nfcZone, state === 'done' && styles.nfcZoneLinked]}>
            <Ionicons
              name={
                state === 'done' || state === 'activating'
                  ? 'checkmark-circle'
                  : state === 'listening'
                    ? 'radio-outline'
                    : 'phone-portrait-outline'
              }
              size={36}
              color={state === 'done' || state === 'activating' ? colors.success : colors.text}
            />
          </View>
          <View style={styles.phoneBody}>
            <View style={styles.dynamicIsland} />
          </View>
        </View>

        <Text variant="h3" style={styles.tapTitle}>
          {state === 'activating'
            ? 'Activating…'
            : state === 'listening'
              ? 'Ready — hold stamp here'
              : 'Tap to start'}
        </Text>
        <Text variant="bodySmall" muted style={styles.tapHint}>
          {state === 'activating'
            ? 'Linking your stamp and starting your trial.'
            : state === 'listening'
              ? 'Hold your TapStamp flat against the top of your iPhone.'
              : 'Tap here, then hold your stamp to the top of your phone.'}
        </Text>
      </Pressable>

      <Button
        title={
          state === 'activating'
            ? 'Activating…'
            : state === 'listening'
              ? 'Waiting for stamp…'
              : 'Activate with TapStamp'
        }
        onPress={onPrimaryPress}
        loading={busy}
        disabled={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  title: {
    letterSpacing: -0.5,
  },
  subtitle: {
    lineHeight: 24,
    maxWidth: 340,
  },
  phoneZone: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  phoneZoneActive: {
    borderColor: colors.text,
  },
  phoneFrame: { alignItems: 'center', marginBottom: spacing.lg },
  nfcZone: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
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
    width: 140,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dynamicIsland: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginTop: -8,
  },
  tapTitle: { textAlign: 'center' },
  tapHint: { textAlign: 'center', maxWidth: 300, marginTop: spacing.sm, lineHeight: 22 },
});
