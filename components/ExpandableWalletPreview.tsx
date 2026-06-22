import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { WalletPreviewPair, type WalletPreviewProps } from '@/components/onboarding/WalletPassPreview';
import { colors, radius, spacing } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableWalletPreviewProps extends WalletPreviewProps {
  title?: string;
}

export function ExpandableWalletPreview({
  title = 'Wallet preview',
  ...preview
}: ExpandableWalletPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Card style={styles.card} padded={false}>
      <Pressable onPress={toggle} style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h3">{title}</Text>
          <Text variant="caption" muted>
            {expanded ? 'Tap to collapse' : 'Tap to see Apple & Google Wallet'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.preview}>
          <WalletPreviewPair {...preview} />
        </View>
      ) : (
        <View style={styles.collapsedRow}>
          <View style={[styles.miniPass, { backgroundColor: preview.backgroundColor }]}>
            <View style={[styles.miniDot, { backgroundColor: preview.foregroundColor }]} />
          </View>
          <Text variant="caption" muted style={styles.collapsedHint}>
            {preview.businessName ?? 'Your business'} · {preview.stampGoal ?? 10} stamps
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  preview: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  miniPass: {
    width: 48,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDot: { width: 8, height: 8, borderRadius: radius.full },
  collapsedHint: { flex: 1 },
});
