import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { saveOnboardingDraft } from '@/lib/onboardingDraft';
import { colors, radius, spacing } from '@/constants/theme';

const TYPES = [
  { id: 'cafe', label: 'Coffee shop', icon: 'cafe-outline' as const },
  { id: 'bakery', label: 'Bakery', icon: 'restaurant-outline' as const },
  { id: 'restaurant', label: 'Restaurant', icon: 'fast-food-outline' as const },
  { id: 'bar', label: 'Bar & pub', icon: 'wine-outline' as const },
  { id: 'retail', label: 'Retail', icon: 'bag-outline' as const },
  { id: 'other', label: 'Other', icon: 'storefront-outline' as const },
];

export default function BizTypeScreen() {
  const [selected, setSelected] = useState('cafe');

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={1}
        title="What do you run?"
        subtitle="We'll tailor your loyalty card to your business."
      />

      <View style={styles.grid}>
        {TYPES.map((type) => {
          const active = selected === type.id;
          return (
            <Pressable
              key={type.id}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setSelected(type.id)}
            >
              <Ionicons
                name={type.icon}
                size={22}
                color={active ? colors.accentDark : colors.textSecondary}
              />
              <Text variant="bodySmall" style={active && styles.optionLabelActive}>
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Continue"
        onPress={async () => {
          await saveOnboardingDraft({ bizType: selected });
          router.push('/(onboarding)/logo-upload');
        }}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  option: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 88,
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  optionLabelActive: {
    fontWeight: '600',
    color: colors.accentDark,
  },
  cta: { marginTop: spacing.xl },
});
