import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from './Text';
import { Input } from './Input';
import { colors, radius, spacing } from '@/constants/theme';

const PRESET_COLORS = [
  '#1A1814', '#2C2416', '#3D3225', '#4A3728', '#5C4033',
  '#8B6F47', '#A67C52', '#C9A96E', '#D4B896', '#E8D5B5',
  '#F5F0E8', '#FAF8F5', '#FFFFFF', '#F8F4F0', '#E5DDD3',
  '#2C3E50', '#1B2838', '#0C0E14', '#1A1A2E', '#16213E',
  '#4A7C59', '#2D6A4F', '#40916C', '#52B788', '#95D5B2',
  '#8E4B62', '#9B2335', '#C1121F', '#E63946', '#FF6B6B',
  '#6B4C9A', '#5E548E', '#9B5DE5', '#B185DB', '#E0AAFF',
  '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF',
  '#F4A261', '#E76F51', '#E9C46A', '#F1C40F', '#F39C12',
  '#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51',
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
];

function normalizeHex(value: string): string | null {
  const cleaned = value.replace(/[^0-9A-Fa-f#]/g, '');
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  return null;
}

function hexToRgb(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!match) return '#C9A96E';
  return `#${[match[1], match[2], match[3]]
    .map((v) => Number(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

interface ColorPickerFieldProps {
  label: string;
  valueRgb: string;
  onChangeRgb: (rgb: string) => void;
}

export function ColorPickerField({ label, valueRgb, onChangeRgb }: ColorPickerFieldProps) {
  const selectedHex = rgbToHex(valueRgb);

  const pickHex = (hex: string) => {
    onChangeRgb(hexToRgb(hex));
  };

  const onHexInput = (text: string) => {
    const hex = normalizeHex(text);
    if (hex) pickHex(hex);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <View style={[styles.preview, { backgroundColor: selectedHex }]}>
        <Text variant="caption" style={{ color: contrastText(selectedHex) }}>
          {selectedHex}
        </Text>
      </View>
      <Input
        label="Custom hex"
        value={selectedHex}
        onChangeText={onHexInput}
        autoCapitalize="characters"
        placeholder="#C9A96E"
      />
      <View style={styles.grid}>
        {PRESET_COLORS.map((hex) => (
          <Pressable
            key={`${label}-${hex}`}
            style={[
              styles.swatch,
              { backgroundColor: hex },
              selectedHex === hex && styles.swatchSelected,
            ]}
            onPress={() => pickHex(hex)}
          />
        ))}
      </View>
    </View>
  );
}

function contrastText(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? colors.text : colors.white;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  preview: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
});

export { hexToRgb, rgbToHex };
