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

type ActivateState = 'listening' | 'activating' | 'done';

export default function ActivateScreen() {
  const { signOut, refreshBusiness } = useAuth();
  const [state, setState] = useState<ActivateState>('listening');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
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
      alert('Could not link stamp', result.error);
      return;
    }

    const biz = await refreshBusiness();
    setState('done');

    const destination = biz?.onboarding_status === 'complete'
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
        <Text variant="caption" style={styles.eyebrow}>Step 2 · Link your stamp</Text>
        <Text variant="hero" style={styles.title}>Hold TapStamp to this phone</Text>
        <Text muted style={styles.subtitle}>
          Place the physical stamp flat against the top of your phone. One tap links it to your account — you only do this once.
        </Text>
      </View>

      <View style={[styles.phoneZone, styles.phoneZoneActive]}>
        <View style={[styles.nfcZone, state === 'done' && styles.nfcZoneLinked]}>
          <Ionicons
            name={
              state === 'done' || state === 'activating'
                ? 'checkmark-circle'
                : 'radio-outline'
            }
            size={36}
            color={state === 'done' || state === 'activating' ? colors.success : colors.accentDark}
          />
        </View>

        <Text variant="h3" style={styles.tapTitle}>
          {state === 'activating'
            ? 'Linking…'
            : state === 'done'
              ? 'Linked'
              : 'Ready — hold stamp here'}
        </Text>
        <Text variant="bodySmall" muted style={styles.tapHint}>
          {state === 'activating'
            ? 'Connecting your stamp to your account.'
            : state === 'done'
              ? 'Stamp linked. Continuing setup…'
              : 'Keep the stamp still for a second until you hear a tap or see Linked.'}
        </Text>
      </View>

      {!showManual ? (
        <Pressable
          onPress={() => setShowManual(true)}
          disabled={busy}
          style={styles.manualToggle}
          hitSlop={8}
        >
          <Text variant="bodySmall" color={colors.accentDark}>
            Can&apos;t tap? Enter stamp code instead
          </Text>
        </Pressable>
      ) : (
        <View style={styles.manual}>
          <Text variant="caption" muted style={styles.manualLabel}>STAMP CODE</Text>
          <Text variant="bodySmall" muted style={styles.manualHint}>
            Use the short code printed on your TapStamp or packing slip.
          </Text>
          <Input
            value={manualCode}
            onChangeText={(t) => setManualCode(t.toUpperCase())}
            placeholder="Enter stamp code"
            autoCapitalize="characters"
            editable={!busy}
            autoFocus
          />
          <Button
            title="Link with code"
            onPress={() => void runActivation(manualCode)}
            disabled={busy || !manualCode.trim()}
            loading={busy && !!manualCode.trim()}
          />
        </View>
      )}
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
  manualToggle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  manual: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  manualLabel: {
    letterSpacing: 0.8,
  },
  manualHint: {
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});
