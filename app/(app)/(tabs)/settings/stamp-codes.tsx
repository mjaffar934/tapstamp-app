import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { adminGenerateChips, tapUrl } from '@/lib/api';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/constants/theme';

const BATCH_OPTIONS = [1, 5, 10] as const;

export default function StampCodesScreen() {
  const [loading, setLoading] = useState(false);
  const [stamps, setStamps] = useState<Array<{ code: string; tapUrl: string }>>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const alert = useTapStampAlert();

  const generate = async (count: number) => {
    setLoading(true);
    const result = await adminGenerateChips(count);
    setLoading(false);

    if (result.error) {
      alert('Could not generate', result.error);
      return;
    }

    setStamps((prev) => [...(result.stamps ?? []), ...prev]);
  };

  const copyText = async (text: string, code: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Screen>
      <BackHeader />
      <Text variant="h1" style={styles.title}>Stamp codes</Text>
      <Text muted style={styles.subtitle}>
        Generate NFC codes before programming stamps. Each code becomes a unique URL you write to the chip.
      </Text>

      <Card style={styles.howTo}>
        <Text variant="bodySmall" style={styles.howTitle}>How it works</Text>
        <Text variant="bodySmall" muted style={styles.howLine}>1. Generate codes here</Text>
        <Text variant="bodySmall" muted style={styles.howLine}>2. Copy the NFC URL below</Text>
        <Text variant="bodySmall" muted style={styles.howLine}>3. Open NFC Tools (Android) or TagWriter (iOS) → Write URL record</Text>
        <Text variant="bodySmall" muted style={styles.howLine}>4. Hold phone to blank NTAG chip until write succeeds</Text>
        <Text variant="caption" muted style={styles.howNote}>
          iPhones cannot write NFC tags from this app — Apple blocks it. Use NFC Tools on Android for bulk programming.
        </Text>
      </Card>

      <View style={styles.batchRow}>
        {BATCH_OPTIONS.map((count) => (
          <Button
            key={count}
            title={`Generate ${count}`}
            variant="outline"
            onPress={() => void generate(count)}
            loading={loading}
            style={styles.batchBtn}
          />
        ))}
      </View>

      {stamps.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <Text variant="caption" muted style={styles.listLabel}>GENERATED STAMPS</Text>
          {stamps.map((stamp) => (
            <Card key={stamp.code} style={styles.stampCard}>
              <View style={styles.stampHeader}>
                <Text variant="h2" style={styles.code}>{stamp.code}</Text>
                <Pressable
                  onPress={() => void copyText(stamp.code, stamp.code)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={copiedCode === stamp.code ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
              <Text variant="caption" muted>NFC URL</Text>
              <Text variant="bodySmall" style={styles.url}>{stamp.tapUrl || tapUrl(stamp.code)}</Text>
              <Button
                title={copiedCode === `url-${stamp.code}` ? 'Copied URL' : 'Copy NFC URL'}
                variant="outline"
                onPress={() => void copyText(stamp.tapUrl || tapUrl(stamp.code), `url-${stamp.code}`)}
              />
            </Card>
          ))}
        </ScrollView>
      ) : (
        <Card style={styles.empty}>
          <Ionicons name="radio-outline" size={32} color={colors.textMuted} />
          <Text variant="bodySmall" muted style={styles.emptyText}>
            No codes yet. Generate a batch to program your stamps.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 340,
  },
  howTo: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  howTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  howLine: {
    lineHeight: 20,
  },
  howNote: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  batchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  batchBtn: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  listLabel: {
    marginBottom: spacing.xs,
  },
  stampCard: {
    gap: spacing.sm,
  },
  stampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  url: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
});
