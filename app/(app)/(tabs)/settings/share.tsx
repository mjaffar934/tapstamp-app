import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Share, ActivityIndicator, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
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
  const [chipCode, setChipCode] = useState<string | null>(null);
  const [chipInput, setChipInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadChip = useCallback(async () => {
    if (!cafe?.id) {
      setChipCode(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
    loadChip();
  }, [loadChip]);

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
      Alert.alert('Enter a stamp code', 'Type the code printed on your TapStamp stamp.');
      return;
    }

    setLinking(true);
    const result = await linkChip(code);
    setLinking(false);

    if (result.error) {
      Alert.alert('Could not link stamp', result.error);
      return;
    }

    setChipInput('');
    await loadChip();
    await refetchCafe();
    Alert.alert(
      result.trialStarted ? 'Stamp linked — trial started' : 'Stamp linked',
      result.trialStarted
        ? `Code ${code} is linked. Your 14-day trial is now running.`
        : `Code ${code} is now linked to your cafe.`,
    );
  };

  if (isLoading) {
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
      <BackHeader />
      <ScreenHeader
        compact
        title="Share programme"
        subtitle="QR code and tap link for posters, receipts, or your counter stamp."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Complete onboarding to get your signup link.</Text>
        </Card>
      ) : !chipCode ? (
        <Card style={styles.linkCard}>
          <Ionicons name="radio-outline" size={32} color={colors.textMuted} />
          <Text variant="h3">Link your stamp</Text>
          <Text variant="bodySmall" muted>
            Hold your TapStamp to your phone or enter the code below. Linking starts your 14-day trial.
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

            {url ? (
              <View style={styles.qrWrap}>
                <QRCode value={url} size={180} backgroundColor={colors.surface} color={colors.text} />
              </View>
            ) : null}

            <Text variant="caption" muted style={styles.urlLabel}>TAP URL</Text>
            <Text variant="bodySmall" style={styles.url} selectable>{url}</Text>
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
  qrWrap: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginVertical: spacing.sm,
  },
  urlLabel: { alignSelf: 'flex-start', marginTop: spacing.sm },
  url: { color: colors.accentDark, alignSelf: 'stretch' },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
});
