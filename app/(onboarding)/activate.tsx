import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { subscribeToDeepLinks } from '@/lib/authLinking';
import { activateStamp } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OwnerFlowSteps } from '@/components/auth/OwnerFlowSteps';
import { colors, radius, spacing } from '@/constants/theme';

type ActivateState = 'idle' | 'listening' | 'activating' | 'done';

export default function ActivateScreen() {
  const { signOut, refreshBusiness, business } = useAuth();
  const [state, setState] = useState<ActivateState>('idle');
  const [manualCode, setManualCode] = useState('');
  const activatingRef = useRef(false);
  const alert = useTapStampAlert();

  const runActivation = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || activatingRef.current) return;

    activatingRef.current = true;
    setState('activating');

    const result = await activateStamp(normalized);
    if (result.error) {
      activatingRef.current = false;
      setState('listening');
      alert('Could not activate', result.error);
      return;
    }

    await refreshBusiness();
    setState('done');

    const destination = business?.onboarding_status === 'complete'
      ? '/(app)/(tabs)/home'
      : '/(onboarding)/welcome';
    router.replace(destination);
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

  const handleSignOut = async () => {
    await signOut();
  };

  const busy = state === 'activating' || state === 'done';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={() => void handleSignOut()} hitSlop={12}>
          <Text variant="bodySmall" color={colors.textSecondary}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <OwnerFlowSteps current="activate" />
        <Text variant="caption" style={styles.eyebrow}>Step 2 · Activate</Text>
        <Text variant="hero" style={styles.title}>Link your TapStamp</Text>
        <Text muted style={styles.subtitle}>
          Hold your TapStamp to the top of your phone. This links your account to your stamp — each stamp can only be linked once.
        </Text>
      </View>

      <Pressable
        style={[styles.phoneZone, state !== 'idle' && styles.phoneZoneActive]}
        onPress={() => state === 'idle' && setState('listening')}
        disabled={busy}
      >
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
            color={state === 'done' || state === 'activating' ? colors.success : colors.accentDark}
          />
        </View>

        <Text variant="h3" style={styles.tapTitle}>
          {state === 'activating'
            ? 'Linking…'
            : state === 'listening'
              ? 'Ready — hold stamp here'
              : 'Tap to start'}
        </Text>
        <Text variant="bodySmall" muted style={styles.tapHint}>
          {state === 'activating'
            ? 'Connecting your stamp to your account.'
            : state === 'listening'
              ? 'Hold your TapStamp flat against the top of your phone.'
              : 'Tap here, then hold your stamp to the top of your phone.'}
        </Text>
      </Pressable>

      <View style={styles.manual}>
        <Text variant="caption" muted style={styles.manualLabel}>STAMP CODE (OPTIONAL)</Text>
        <Input
          value={manualCode}
          onChangeText={(t) => setManualCode(t.toUpperCase())}
          placeholder="Enter code from stamp"
          autoCapitalize="characters"
          editable={!busy}
        />
        <Button
          title="Activate with code"
          variant="outline"
          onPress={() => void runActivation(manualCode)}
          disabled={busy || !manualCode.trim()}
        />
      </View>

      <Button
        title={
          state === 'activating'
            ? 'Linking…'
            : state === 'listening'
              ? 'Waiting for stamp…'
              : 'Activate with TapStamp'
        }
        onPress={() => {
          if (state === 'idle') setState('listening');
        }}
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
    marginBottom: spacing.md,
  },
  phoneZoneActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  nfcZone: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  nfcZoneLinked: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  tapTitle: { textAlign: 'center' },
  tapHint: { textAlign: 'center', maxWidth: 300, marginTop: spacing.sm, lineHeight: 22 },
  manual: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  manualLabel: {
    letterSpacing: 0.8,
  },
});
