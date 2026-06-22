import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { Screen } from './Screen';
import { Text } from './Text';
import { Card } from './Card';

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
}

export function PlaceholderScreen({ title, subtitle, icon, hint }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="h1">{title}</Text>
        <Text muted style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={32} color={colors.accent} />
        </View>
        <Text variant="h3" style={styles.cardTitle}>
          Coming soon
        </Text>
        <Text muted style={styles.cardBody}>
          {hint ?? 'This screen is scaffolded and ready for your next build step.'}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  subtitle: {
    maxWidth: 320,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    textAlign: 'center',
  },
  cardBody: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
