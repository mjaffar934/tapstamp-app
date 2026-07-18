import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, radius } from '@/constants/theme';

interface BusinessLogoProps {
  logoUrl?: string | null;
  businessName?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function BusinessLogo({ logoUrl, businessName, size = 48, style }: BusinessLogoProps) {
  const borderRadius = size * 0.22;

  if (logoUrl) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius }, style]}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size - 10, height: size - 10 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const initial = businessName?.trim().charAt(0).toUpperCase();
  if (initial) {
    return (
      <View style={[styles.wrap, styles.initial, { width: size, height: size, borderRadius }, style]}>
        <Text style={[styles.initialText, { fontSize: size * 0.38 }]}>{initial}</Text>
      </View>
    );
  }

  return <BrandLogo size={size} style={style} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  initial: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  initialText: {
    fontWeight: '700',
    color: colors.accentDark,
  },
});
