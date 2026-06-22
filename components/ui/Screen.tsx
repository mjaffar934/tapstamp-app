import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  padded?: boolean;
  safe?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  safe = true,
  refreshing,
  onRefresh,
  contentContainerStyle,
  style,
  ...props
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      style={[styles.flex, style]}
      contentContainerStyle={[
        padded && styles.padded,
        styles.scrollContent,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        ) : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>
  );

  if (safe) {
    return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
  }

  return content;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
