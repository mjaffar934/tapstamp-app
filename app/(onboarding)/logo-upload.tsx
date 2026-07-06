import { useState } from 'react';
import { Image, Pressable, View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { saveOnboardingDraft } from '@/lib/onboardingDraft';
import { colors, radius, spacing } from '@/constants/theme';

export default function LogoUploadScreen() {
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access', 'Allow photo access to add your logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setLogoUri(result.assets[0].uri);
      await saveOnboardingDraft({ logoUri: result.assets[0].uri });
    }
  };

  const continueNext = async () => {
    if (logoUri) await saveOnboardingDraft({ logoUri });
    router.push('/(onboarding)/loyalty-setup');
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={2}
        title="Add your logo"
        subtitle="Optional. Appears on your customers' wallet cards and at the counter."
      />

      <Pressable onPress={pickLogo} style={styles.uploadZone}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.uploadIcon}>
            <Ionicons name="image-outline" size={28} color={colors.accentDark} />
          </View>
        )}
        <Text variant="h3">{logoUri ? 'Change logo' : 'Upload logo'}</Text>
        <Text variant="caption" muted>PNG or JPG</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button title="Continue" onPress={continueNext} />
        <Button title="Skip" variant="ghost" onPress={continueNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  uploadZone: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  preview: { width: 200, height: 50 },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
