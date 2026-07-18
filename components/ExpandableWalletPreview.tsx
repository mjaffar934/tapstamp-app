import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { WalletPassCard, type WalletPreviewProps } from '@/components/onboarding/WalletPassPreview';
import { colors, radius, spacing } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableWalletPreviewProps extends WalletPreviewProps {
  title?: string;
  defaultExpanded?: boolean;
}

export function ExpandableWalletPreview({
  title = 'Wallet pass',
  defaultExpanded = true,
  ...preview
}: ExpandableWalletPreviewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h3">{title}</Text>
          <Text variant="caption" muted>
            {expanded ? 'Tap to collapse' : 'Tap to preview your wallet pass'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.preview}>
          <WalletPassCard {...preview} />
          <Text variant="caption" muted style={styles.hint}>
            Preview of your customer Wallet pass
          </Text>
        </View>
      ) : (
        <Pressable onPress={toggle} style={styles.collapsedRow}>
          <View style={[styles.miniPass, { backgroundColor: preview.backgroundColor }]}>
            <View style={[styles.miniStripe, { backgroundColor: preview.foregroundColor }]} />
          </View>
          <Text variant="caption" muted style={styles.collapsedHint}>
            {preview.businessName ?? 'Your business'} · {preview.stampGoal ?? 10} stamps
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  preview: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: { textAlign: 'center' },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  miniPass: {
    width: 52,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  miniStripe: {
    height: 4,
    width: '100%',
  },
  collapsedHint: { flex: 1 },
});
