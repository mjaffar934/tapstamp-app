import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { radius } from '@/constants/theme';

interface BrandLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function BrandLogo({ size = 44, style }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Image
        source={require('@/assets/icon.png')}
        style={[{ width: size * 0.72, height: size * 0.72 }, style]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    borderRadius: radius.md,
  },
});
