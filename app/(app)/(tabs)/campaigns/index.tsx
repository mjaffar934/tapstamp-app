import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { sendCampaign } from '@/lib/api';
import {
  campaignPhase,
  formatCampaignSchedule,
  hasCampaignMessage,
} from '@/lib/campaignSchedule';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { combineDateAndTime, TimePickerField } from '@/components/ui/TimePickerField';
import { colors, spacing } from '@/constants/theme';

function phaseLabel(phase: ReturnType<typeof campaignPhase>): string {
  if (phase === 'live') return 'Live on tap page';
  if (phase === 'upcoming') return 'Scheduled — shows before start';
  if (phase === 'ended') return 'Ended — hidden from customers';
  return '';
}

export default function CampaignsScreen() {
  const { cafe, isLoading, refetch } = useOwnerCafe();
  const alert = useTapStampAlert();
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!cafe) return;
    setMessage(cafe.active_campaign_message ?? '');
    if (cafe.campaign_starts_at) {
      const start = new Date(cafe.campaign_starts_at);
      setEventDate(start);
      setStartTime(start);
    }
    if (cafe.campaign_ends_at) {
      setEndTime(new Date(cafe.campaign_ends_at));
    }
  }, [cafe]);

  const publish = async () => {
    if (!cafe?.id) return;
    if (!message.trim()) {
      alert('Add a message', 'Write something for customers to see on your tap page.');
      return;
    }

    const startsAt = combineDateAndTime(eventDate, startTime);
    const endsAt = combineDateAndTime(eventDate, endTime);

    if (new Date(endsAt) <= new Date(startsAt)) {
      alert('Check times', 'End time must be after start time.');
      return;
    }

    setSending(true);
    const result = await sendCampaign(cafe.id, message.trim(), { startsAt, endsAt });
    setSending(false);

    if (result.error) {
      alert('Could not publish', result.error);
      return;
    }

    await refetch();
    alert('Published', 'Customers will see this on your tap page during the scheduled window.');
  };

  const confirmClearCampaign = () => {
    alert(
      'Remove message?',
      'This deletes the upcoming message from your tap page immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void clearCampaign() },
      ],
    );
  };

  const clearCampaign = async () => {
    if (!cafe?.id) return;
    setSending(true);
    const result = await sendCampaign(cafe.id, '');
    setSending(false);
    if (result.error) {
      alert('Could not delete', result.error);
      return;
    }
    setMessage('');
    const resetDate = new Date();
    setEventDate(resetDate);
    const resetStart = new Date(resetDate);
    resetStart.setHours(9, 0, 0, 0);
    setStartTime(resetStart);
    const resetEnd = new Date(resetDate);
    resetEnd.setHours(17, 0, 0, 0);
    setEndTime(resetEnd);
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

  const scheduleLabel = formatCampaignSchedule(cafe?.campaign_starts_at, cafe?.campaign_ends_at);
  const phase = cafe ? campaignPhase(cafe) : null;
  const showActiveCard = cafe && hasCampaignMessage(cafe);

  return (
    <Screen refreshing={isLoading} onRefresh={refetch}>
      <ScreenHeader
        title="Campaigns"
        subtitle="Scheduled messages on your customer tap page"
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Link your TapStamp to publish customer messages.
          </Text>
        </Card>
      ) : (
        <>
          {showActiveCard ? (
            <Card style={styles.active}>
              <Text variant="caption" muted>
                {phase === 'live' ? 'LIVE' : phase === 'upcoming' ? 'SCHEDULED' : 'ENDED'}
              </Text>
              <Text variant="bodySmall">{cafe.active_campaign_message}</Text>
              {scheduleLabel ? (
                <Text variant="caption" muted>{scheduleLabel}</Text>
              ) : null}
              {phase ? (
                <Text variant="caption" color={phase === 'live' ? colors.success : colors.textMuted}>
                  {phaseLabel(phase)}
                </Text>
              ) : null}
              <Button
                title="Delete message"
                variant="ghost"
                onPress={confirmClearCampaign}
                disabled={sending}
              />
            </Card>
          ) : null}

          <Card style={styles.section}>
            <Text variant="h3">Tap page message</Text>
            <Text variant="caption" muted style={styles.hint}>
              Shown on your tap page with date and time. Hidden automatically after it ends.
            </Text>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Double stamps this Saturday!"
              multiline
              style={styles.input}
            />
            <DatePickerField
              label="Event date"
              value={eventDate}
              onChange={setEventDate}
              minimumDate={new Date()}
            />
            <View style={styles.timeRow}>
              <TimePickerField
                label="From"
                value={startTime}
                onChange={setStartTime}
              />
              <TimePickerField
                label="Until"
                value={endTime}
                onChange={setEndTime}
              />
            </View>
            <Button
              title={sending ? 'Publishing…' : 'Publish message'}
              onPress={publish}
              disabled={sending}
            />
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
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
