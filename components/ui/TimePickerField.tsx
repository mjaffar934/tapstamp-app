import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from './Text';
import { Button } from './Button';
import { colors, radius, spacing } from '@/constants/theme';

interface TimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function withTime(base: Date, hours: number, minutes: number): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function timeFromString(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map((part) => parseInt(part, 10));
  return withTime(base, Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0);
}

export function combineDateAndTime(date: Date, time: Date, timeZone = 'Europe/London'): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = time.getHours();
  const minute = time.getMinutes();

  // Interpret the picker values as wall-clock time in Europe/London (tap page display TZ).
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asLondon = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    utcMs += wanted - asLondon;
  }
  return new Date(utcMs).toISOString();
}

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const openPicker = () => {
    setDraft(value);
    setOpen(true);
  };

  const onPickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    if (Platform.OS === 'android') {
      setOpen(false);
      onChange(date);
      return;
    }
    setDraft(date);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" muted style={styles.label}>
        {label}
      </Text>
      <Pressable style={styles.field} onPress={openPicker} accessibilityRole="button">
        <Text variant="body">{formatTimeLabel(value)}</Text>
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="time"
          display="default"
          is24Hour
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text variant="h3" style={styles.sheetTitle}>
              {label}
            </Text>
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              is24Hour
              onChange={onPickerChange}
              style={styles.picker}
            />
            <Button title="Done" onPress={confirm} />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, flex: 1 },
  label: { textTransform: 'uppercase', letterSpacing: 0.6 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: { textAlign: 'center' },
  picker: { alignSelf: 'stretch' },
});
