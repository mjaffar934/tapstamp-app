import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { designPassWithAi, uploadCafeLogo, uploadCafeStrip } from '@/lib/api';
import { resolveCafePassColors } from '@/lib/passTemplates';
import { classicBrandColors } from '@/lib/onboardingDraft';
import { quizToAiPayload, paletteFromQuiz, type PassDesignQuiz } from '@/lib/passDesignQuiz';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { colors, radius, spacing } from '@/constants/theme';

export default function PassDesignScreen() {
  const { business } = useAuth();
  const { cafe, isLoading, isSaving, updateCafe, refetch } = useOwnerCafe();
  const alert = useTapStampAlert();

  const [mode, setMode] = useState<'classic' | 'ai'>('classic');
  const [bg, setBg] = useState(classicBrandColors().backgroundColor);
  const [fg, setFg] = useState(classicBrandColors().foregroundColor);
  const [label, setLabel] = useState(classicBrandColors().labelColor);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [stripUri, setStripUri] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStrip, setUploadingStrip] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const lockedQuiz = cafe?.pass_design_quiz as PassDesignQuiz | null | undefined;
  const isLocked = Boolean(cafe?.pass_design_locked_at);

  useEffect(() => {
    if (!cafe) return;
    const r = resolveCafePassColors(cafe);
    const classic = classicBrandColors();
    const savedMode = cafe.pass_design_mode === 'ai' || cafe.pass_design_mode === 'classic'
      ? cafe.pass_design_mode
      : (r.backgroundColor === classic.backgroundColor ? 'classic' : 'ai');
    setMode(savedMode);
    setBg(r.backgroundColor);
    setFg(r.foregroundColor);
    setLabel(r.labelColor);
    setLogoUri(cafe.logo_url);
    setStripUri(cafe.strip_image_url ?? null);
  }, [
    cafe?.id,
    cafe?.background_color,
    cafe?.foreground_color,
    cafe?.label_color,
    cafe?.logo_url,
    cafe?.strip_image_url,
    cafe?.pass_design_mode,
  ]);

  const isDirty = useMemo(() => {
    if (!cafe) return false;
    const r = resolveCafePassColors(cafe);
    return (
      bg !== r.backgroundColor ||
      fg !== r.foregroundColor ||
      label !== r.labelColor ||
      mode !== (cafe.pass_design_mode ?? 'classic')
    );
  }, [cafe, bg, fg, label, mode]);

  const applyColors = useCallback(async (
    nextMode: 'classic' | 'ai',
    colorsNext: { backgroundColor: string; foregroundColor: string; labelColor: string },
  ) => {
    if (!cafe) return;
    const { error } = await updateCafe({
      pass_template: 'classic',
      pass_design_mode: nextMode,
      background_color: colorsNext.backgroundColor,
      foreground_color: colorsNext.foregroundColor,
      label_color: colorsNext.labelColor,
      ...(nextMode === 'ai'
        ? {
            ai_background_color: colorsNext.backgroundColor,
            ai_foreground_color: colorsNext.foregroundColor,
            ai_label_color: colorsNext.labelColor,
          }
        : {}),
    });
    if (error) {
      alert('Could not save', error);
      return;
    }
    setMode(nextMode);
    setBg(colorsNext.backgroundColor);
    setFg(colorsNext.foregroundColor);
    setLabel(colorsNext.labelColor);
    await refetch();
  }, [cafe, updateCafe, refetch, alert]);

  const { confirmLeave } = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => {
      await applyColors(mode, { backgroundColor: bg, foregroundColor: fg, labelColor: label });
    },
  });

  const useClassic = async () => {
    const c = classicBrandColors();
    setAiNote('TapStamp classic — dark gold premium look.');
    await applyColors('classic', c);
  };

  const useAi = async () => {
    if (!cafe?.id) return;

    // Prefer saved AI palette so switching is instant and consistent
    if (cafe.ai_background_color && cafe.ai_foreground_color && cafe.ai_label_color) {
      setAiNote('Your AI shop card.');
      await applyColors('ai', {
        backgroundColor: cafe.ai_background_color,
        foregroundColor: cafe.ai_foreground_color,
        labelColor: cafe.ai_label_color,
      });
      return;
    }

    if (!lockedQuiz) {
      alert(
        'Shop answers locked in onboarding',
        'AI design needs the shop quiz from onboarding. Restart onboarding from settings if this cafe never completed it.',
      );
      return;
    }

    setAiBusy(true);
    const payload = quizToAiPayload(lockedQuiz, cafe.name, business?.business_type);
    const result = await designPassWithAi(cafe.id, {
      bizType: business?.business_type,
      apply: true,
      quiz: payload,
      useLockedQuiz: true,
    });
    setAiBusy(false);

    if (result.error || !result.suggestion) {
      const local = lockedQuiz
        ? paletteFromQuiz(lockedQuiz)
        : {
            backgroundColor: 'rgb(255, 252, 248)',
            foregroundColor: 'rgb(72, 48, 32)',
            labelColor: 'rgb(120, 108, 96)',
            rationale: 'Applied a shop palette from your locked onboarding answers.',
          };
      setAiNote(
        result.error
          ? `AI was unavailable. Used your shop answers for colours instead.`
          : local.rationale,
      );
      await applyColors('ai', {
        backgroundColor: local.backgroundColor,
        foregroundColor: local.foregroundColor,
        labelColor: local.labelColor,
      });
      return;
    }

    const s = result.suggestion;
    setAiNote(s.rationale);
    await applyColors('ai', {
      backgroundColor: s.background_color,
      foregroundColor: s.foreground_color,
      labelColor: s.label_color,
    });
    await refetch();
  };

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

  const pickStrip = async () => {
    if (!cafe?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Permission needed', 'Allow photo access to upload a strip image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingStrip(true);
    const upload = await uploadCafeStrip(cafe.id, result.assets[0].uri);
    setUploadingStrip(false);
    if (upload.error) {
      alert('Upload failed', upload.error);
      return;
    }
    setStripUri(upload.url ?? result.assets[0].uri);
    await refetch();
  };

  const clearStrip = async () => {
    if (!cafe?.id) return;
    const { error } = await updateCafe({ strip_image_url: null });
    if (error) {
      alert('Could not remove', error);
      return;
    }
    setStripUri(null);
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

  return (
    <Screen>
      <BackHeader onBack={() => confirmLeave(() => { if (router.canGoBack()) router.back(); })} />
      <ScreenHeader
        compact
        title="Pass design"
        subtitle="Switch Classic ↔ AI anytime. Shop answers are locked from onboarding."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Link your cafe to customise the wallet pass.</Text>
        </Card>
      ) : (
        <>
          <ExpandableWalletPreview
            title="Wallet preview"
            businessName={business?.name ?? cafe.name}
            backgroundColor={bg}
            foregroundColor={fg}
            labelColor={label}
            logoUri={logoUri}
            stripImageUri={stripUri}
            stampGoal={cafe.stamp_goal ?? 10}
            stampsFilled={Math.min(2, cafe.stamp_goal ?? 10)}
            reward={cafe.reward || 'Free coffee'}
            memberCode="4827"
            showCustomerName
            customerName="Alex"
          />

          {isLocked ? (
            <Card style={styles.lockNote}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.accentDark} />
              <Text variant="caption" style={styles.lockNoteText}>
                Shop & reward answers are locked from onboarding. You can still switch Classic and AI, and update logo or strip art.
              </Text>
            </Card>
          ) : (
            <Card style={styles.lockNote}>
              <Text variant="caption" muted>
                Finish onboarding to lock in personalised shop answers for AI.
              </Text>
            </Card>
          )}

          <Card style={styles.section}>
            <Text variant="h3">Card look</Text>
            <Button
              title="Use TapStamp classic"
              variant={mode === 'classic' ? 'primary' : 'outline'}
              loading={isSaving && mode !== 'classic'}
              onPress={() => void useClassic()}
            />
            <Button
              title="Use AI shop card"
              variant={mode === 'ai' ? 'primary' : 'outline'}
              loading={aiBusy}
              disabled={aiBusy}
              onPress={() => void useAi()}
            />
            {aiNote ? <Text variant="bodySmall" style={styles.aiNote}>{aiNote}</Text> : null}
          </Card>

          <Card style={styles.section}>
            <Text variant="h3">Shop logo</Text>
            <Text variant="caption" muted>White backgrounds are removed automatically for Wallet.</Text>
            <Pressable onPress={pickLogo} disabled={uploadingLogo} style={styles.logoBox}>
              {uploadingLogo ? (
                <ActivityIndicator color={colors.accent} />
              ) : logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="contain" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={22} color={colors.accentDark} />
                  <Text variant="caption" muted>Tap to upload logo</Text>
                </>
              )}
            </Pressable>
          </Card>

          <Card style={styles.section}>
            <Text variant="h3">Strip image (optional)</Text>
            <Text variant="caption" muted>
              Wide photo behind the stamp dots. Stamp dots still overlay on top.
            </Text>
            <Pressable onPress={pickStrip} disabled={uploadingStrip} style={styles.stripBox}>
              {uploadingStrip ? (
                <ActivityIndicator color={colors.accent} />
              ) : stripUri ? (
                <Image source={{ uri: stripUri }} style={styles.stripPreview} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={22} color={colors.accentDark} />
                  <Text variant="caption" muted>Tap to upload strip / thumbnail</Text>
                </>
              )}
            </Pressable>
            {stripUri ? (
              <Button title="Remove strip image" variant="ghost" onPress={() => void clearStrip()} />
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.sm, marginBottom: spacing.md },
  lockNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: colors.accentMuted,
  },
  lockNoteText: { flex: 1, color: colors.accentDark, lineHeight: 18 },
  logoBox: {
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  logoPreview: { width: 180, height: 48 },
  stripBox: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  stripPreview: { width: '100%', height: 72, borderRadius: radius.sm },
  aiNote: {
    backgroundColor: colors.accentMuted,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
});
