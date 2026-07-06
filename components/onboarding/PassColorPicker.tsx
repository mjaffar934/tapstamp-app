import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  PASS_BACKGROUND_COLORS,
  PASS_FOREGROUND_COLORS,
  PASS_LABEL_COLORS,
  labelColorForBackground,
} from '@/constants/passColors';
import { colors, radius, spacing } from '@/constants/theme';

type ColorRole = 'background' | 'foreground' | 'label';

interface PassColorPickerProps {
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  onChange: (colors: { backgroundColor: string; foregroundColor: string; labelColor: string }) => void;
}

function SwatchRow({
  title,
  role,
  selected,
  swatches,
  onSelect,
}: {
  title: string;
  role: ColorRole;
  selected: string;
  swatches: string[];
  onSelect: (color: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="label" style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.swatchRow}
      >
        {swatches.map((color) => {
          const active = selected === color;
          const isLight = color.includes('250') || color.includes('255') || color.includes('245');
          return (
            <Pressable
              key={`${role}-${color}`}
              onPress={() => onSelect(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                active && styles.swatchActive,
                isLight && styles.swatchLight,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {active ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={isLight ? colors.text : colors.white}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function PassColorPicker({
  backgroundColor,
  foregroundColor,
  labelColor,
  onChange,
}: PassColorPickerProps) {
  const setBackground = (backgroundColor: string) => {
    onChange({
      backgroundColor,
      foregroundColor,
      labelColor: labelColorForBackground(backgroundColor),
    });
  };

  return (
    <View style={styles.wrap}>
      <SwatchRow
        title="Card background"
        role="background"
        selected={backgroundColor}
        swatches={PASS_BACKGROUND_COLORS}
        onSelect={setBackground}
      />
      <SwatchRow
        title="Text & stamps"
        role="foreground"
        selected={foregroundColor}
        swatches={PASS_FOREGROUND_COLORS}
        onSelect={(foregroundColor) => onChange({ backgroundColor, foregroundColor, labelColor })}
      />
      <SwatchRow
        title="Labels"
        role="label"
        selected={labelColor}
        swatches={PASS_LABEL_COLORS}
        onSelect={(labelColor) => onChange({ backgroundColor, foregroundColor, labelColor })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { marginBottom: 2 },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
    paddingRight: spacing.md,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchLight: {
    borderColor: colors.border,
  },
  swatchActive: {
    borderColor: colors.text,
    transform: [{ scale: 1.08 }],
  },
});
