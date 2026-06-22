import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/theme';

type TextVariant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
}

export function Text({
  variant = 'body',
  color,
  muted,
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        styles.base,
        { color: color ?? (muted ? colors.textSecondary : colors.text) },
        style,
      ]}
      {...props}
    />
  );
}

export function Label({ children, style, ...props }: TextProps) {
  return (
    <RNText
      style={[styles.label, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Inter_400Regular',
  },
  label: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
