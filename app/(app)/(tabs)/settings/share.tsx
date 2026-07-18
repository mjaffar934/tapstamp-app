import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Share, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { supabase } from '@/lib/supabase';
import { linkChip, tapUrl } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

export default function ShareScreen() {
  const { cafe, refetch: refetchCafe } = useOwnerCafe();
  const alert = useTapStampAlert();
  const [chipCode, setChipCode] = useState<string | null>(null);
  const [chipInput, setChipInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadChip = useCallback(async (options?: { silent?: boolean }) => {
    if (!cafe?.id) {
      setChipCode(null);
      if (!options?.silent) setIsLoading(false);
      return;
    }

    if (!options?.silent) setIsLoading(true);
    const { data } = await supabase
      .from('chips')
      .select('code')
      .eq('cafe_id', cafe.id)
      .limit(1)
      .maybeSingle();

    setChipCode((data as { code: string } | null)?.code ?? null);
    setIsLoading(false);
  }, [cafe?.id]);

  useEffect(() => {
    void loadChip();
  }, [loadChip]);

  useFocusEffect(
    useCallback(() => {
      void loadChip({ silent: true });
    }, [loadChip]),
  );

  const url = chipCode ? tapUrl(chipCode) : null;

  const copyLink = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!url || !cafe) return;
    await Share.share({
      message: `Join ${cafe.name}'s loyalty programme — tap to collect stamps: ${url}`,
      url,
    });
  };

  const handleLinkChip = async () => {
    const code = chipInput.trim().toUpperCase();
    if (!code) {
      alert('Enter a stamp code', 'Type the code printed on your TapStamp stamp.');
      return;
    }

    setLinking(true);
    const result = await linkChip(code);
    setLinking(false);

    if (result.error) {
      alert('Could not link stamp', result.error);
      return;
    }

    setChipInput('');
    await loadChip();
    await refetchCafe();
    alert(
      'Stamp linked',
      `Code ${code} is now linked to your business.`,
    );
  };

  if (isLoading && !cafe) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader onBack={() => router.replace('/(app)/(tabs)/settings')} />
      <ScreenHeader
        compact
        title="Share programme"
        subtitle="Tap link for your stamp, posters, and counter."
      />

      {!cafe ? (
        <Card style={styles.linkCard}>
          <Ionicons name="radio-outline" size={32} color={colors.textMuted} />
          <Text variant="h3">Link your stamp</Text>
          <Text variant="bodySmall" muted>
            Enter your TapStamp code to connect it to your business.
          </Text>
          <Input
            label="Stamp code"
            value={chipInput}
            onChangeText={setChipInput}
            autoCapitalize="characters"
            placeholder="DEMO"
          />
          <Button title="Link stamp" onPress={handleLinkChip} loading={linking} />
        </Card>
      ) : !chipCode ? (
        <Card style={styles.linkCard}>
          <Ionicons name="radio-outline" size={32} color={colors.textMuted} />
          <Text variant="h3">Link your stamp</Text>
          <Text variant="bodySmall" muted>
            Hold your TapStamp to your phone or enter the code below.
          </Text>
          <Input
            label="Stamp code"
            value={chipInput}
            onChangeText={setChipInput}
            autoCapitalize="characters"
            placeholder="DEMO"
          />
          <Button title="Link stamp" onPress={handleLinkChip} loading={linking} />
        </Card>
      ) : (
        <>
          <Card style={styles.linkCard}>
            <Text variant="caption" muted>STAMP CODE</Text>
            <Text variant="h2" style={styles.chipCodeText}>{chipCode}</Text>

            <Text variant="caption" muted style={styles.urlLabel}>TAP URL</Text>
            <Text variant="bodySmall" style={styles.url} selectable>{url}</Text>
            <Text variant="caption" muted style={styles.hint}>
              Share this link on posters, social, or email. Customers tap your stamp to open it.
            </Text>
          </Card>

          <View style={styles.actions}>
            <Button title={copied ? 'Copied!' : 'Copy link'} onPress={copyLink} />
            <Button title="Share" variant="outline" onPress={shareLink} />
          </View>

          <Card style={styles.linkCard}>
            <Text variant="h3">Change stamp</Text>
            <Input
              label="New stamp code"
              value={chipInput}
              onChangeText={setChipInput}
              autoCapitalize="characters"
              placeholder="WS01"
            />
            <Button title="Link different stamp" variant="outline" onPress={handleLinkChip} loading={linking} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  linkCard: { gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  chipCodeText: { letterSpacing: 2 },
  hint: { textAlign: 'center', marginTop: spacing.xs },
  urlLabel: { alignSelf: 'flex-start', marginTop: spacing.sm },
  url: { color: colors.accentDark, alignSelf: 'stretch' },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
});
