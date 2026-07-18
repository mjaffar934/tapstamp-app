import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/constants/theme';

export interface TapStampAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface TapStampAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: TapStampAlertButton[];
  onDismiss: () => void;
}

export function TapStampAlert({ visible, title, message, buttons, onDismiss }: TapStampAlertProps) {
  const resolved = buttons.length > 0 ? buttons : [{ text: 'OK' }];

  const handlePress = (button: TapStampAlertButton) => {
    onDismiss();
    button.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss" />
        <View style={styles.card}>
          <Text variant="heading" style={styles.title}>{title}</Text>
          {message ? (
            <Text variant="body" muted style={styles.message}>{message}</Text>
          ) : null}
          <View style={resolved.length > 2 ? styles.buttonsColumn : styles.buttonsRow}>
            {resolved.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <Button
                  key={`${button.text}-${index}`}
                  title={button.text}
                  variant={isDestructive ? 'destructive' : isCancel ? 'outline' : 'primary'}
                  onPress={() => handlePress(button)}
                  style={resolved.length > 2 ? styles.fullWidthButton : styles.flexButton}
                />
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonsColumn: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flexButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
});
