import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { sendCampaign } from '@/lib/api';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

export default function CampaignsScreen() {
  const { user } = useAuth();
  const { cafe, isLoading, refetch } = useOwnerCafe();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(null);

  const handleSend = async () => {
    if (!cafe?.id) return;
    if (!message.trim()) {
      Alert.alert('Add a message', 'Write something for your customers to see on their pass.');
      return;
    }

    setSending(true);
    const result = await sendCampaign(cafe.id, message.trim());
    setSending(false);

    if (result.error) {
      Alert.alert('Could not send', result.error);
      return;
    }

    setLastSent(result.sent ?? 0);
    await refetch();
    Alert.alert(
      'Sent',
      `Wallet update pushed to ${result.sent ?? 0} Apple device${result.sent === 1 ? '' : 's'}. Google Wallet passes updated too.`,
    );
  };

  const clearCampaign = async () => {
    if (!cafe?.id) return;
    setSending(true);
    const result = await sendCampaign(cafe.id, '');
    setSending(false);
    if (result.error) {
      Alert.alert('Could not clear', result.error);
      return;
    }
    setMessage('');
    await refetch();
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
    <Screen refreshing={isLoading} onRefresh={refetch}>
      <ScreenHeader
        title="Campaigns"
        subtitle="Push a message to every customer wallet pass"
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Link your account to a cafe to send wallet campaigns.
          </Text>
        </Card>
      ) : (
        <>
          {cafe.active_campaign_message?.trim() ? (
            <Card style={styles.active}>
              <Text variant="caption" muted>ACTIVE MESSAGE ON PASSES</Text>
              <Text variant="bodySmall">{cafe.active_campaign_message}</Text>
              <Button title="Clear message" variant="ghost" onPress={clearCampaign} disabled={sending} />
            </Card>
          ) : null}

          <Card style={styles.section}>
            <Text variant="h3">Wallet message</Text>
            <Text variant="caption" muted style={styles.hint}>
              Appears on the back of Apple passes and as an update on Google Wallet. Triggers a notification when sent.
            </Text>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Double stamps this Saturday!"
              multiline
              style={styles.input}
            />
            <Button
              title={sending ? 'Sending…' : 'Send to all passes'}
              onPress={handleSend}
              disabled={sending}
            />
            {lastSent != null ? (
              <Text variant="caption" muted style={styles.sent}>
                Last send reached {lastSent} Apple device{lastSent === 1 ? '' : 's'}.
              </Text>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  active: { gap: spacing.xs, marginBottom: spacing.md, backgroundColor: colors.accentMuted },
  section: { gap: spacing.md },
  hint: { marginTop: -spacing.xs },
  input: { minHeight: 88, textAlignVertical: 'top' },
  sent: { textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
