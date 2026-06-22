import { View, StyleSheet, type ReactNode } from 'react-native';
import { Text } from './Text';
import { spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Use on stack sub-screens below BackHeader for consistent top alignment. */
  compact?: boolean;
}

export function ScreenHeader({ title, subtitle, trailing, compact }: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.text}>
        <Text variant="h1">{title}</Text>
        {subtitle ? (
          <Text muted style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  wrapCompact: {
    paddingTop: 0,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    maxWidth: 320,
  },
  trailing: {
    paddingTop: 4,
  },
});
