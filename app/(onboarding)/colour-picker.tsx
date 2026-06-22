import { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import { COLOR_PALETTES, type ColorPalette } from '@/constants/colorPalettes';
import { loadOnboardingDraft, saveOnboardingDraft } from '@/lib/onboardingDraft';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/constants/theme';

export default function ColourPickerScreen() {
  const { business } = useAuth();
  const [selectedId, setSelectedId] = useState(COLOR_PALETTES[0].id);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const palette = COLOR_PALETTES.find((p) => p.id === selectedId) ?? COLOR_PALETTES[0];

  useEffect(() => {
    loadOnboardingDraft().then((draft) => {
      setLogoUri(draft.logoUri);
      const match = COLOR_PALETTES.find(
        (p) => p.backgroundColor === draft.backgroundColor,
      );
      if (match) setSelectedId(match.id);
    });
  }, []);

  const applyPalette = async (p: ColorPalette) => {
    setSelectedId(p.id);
    await saveOnboardingDraft({
      backgroundColor: p.backgroundColor,
      foregroundColor: p.foregroundColor,
      labelColor: p.labelColor,
    });
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={2}
        title="Choose a colour palette"
        subtitle="Curated finishes designed for wallet passes."
      />

      <ExpandableWalletPreview
        businessName={business?.name ?? 'Your business'}
        backgroundColor={palette.backgroundColor}
        foregroundColor={palette.foregroundColor}
        labelColor={palette.labelColor}
        logoUri={logoUri}
        stampGoal={10}
        stampsFilled={3}
        reward="Free coffee"
      />

      <View style={styles.paletteGrid}>
        {COLOR_PALETTES.map((p) => {
          const active = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              style={[styles.paletteCard, active && styles.paletteCardActive]}
              onPress={() => applyPalette(p)}
            >
              <View style={styles.paletteSwatches}>
                <View style={[styles.colorDot, { backgroundColor: p.backgroundColor }]} />
                <View style={[styles.colorDot, { backgroundColor: p.foregroundColor }]} />
                <View style={[styles.colorDot, { backgroundColor: p.labelColor }]} />
              </View>
              <Text variant="label" style={styles.paletteName}>{p.name}</Text>
              <Text variant="caption" muted numberOfLines={2}>{p.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Continue"
        onPress={() => router.push('/(onboarding)/logo-upload')}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  paletteCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  paletteCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  paletteSwatches: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paletteName: { marginTop: spacing.xs },
  cta: { marginTop: spacing.xl, marginBottom: spacing.xl },
});
