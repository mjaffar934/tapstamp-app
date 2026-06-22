import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { Text } from './Text';

interface BackHeaderProps {
  title?: string;
  onBack?: () => void;
}

export function BackHeader({ title, onBack }: BackHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/gate');
    }
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={handleBack} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={colors.accentDark} />
        <Text variant="bodySmall" color={colors.accentDark}>Back</Text>
      </Pressable>
      {title ? <Text variant="label" muted style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  title: {
    marginRight: spacing.sm,
  },
});
