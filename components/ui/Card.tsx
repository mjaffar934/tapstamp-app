import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, radius, shadows, spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ elevated, padded = true, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padded && styles.padded,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
  padded: {
    padding: spacing.md,
  },
});
