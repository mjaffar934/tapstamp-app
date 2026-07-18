import { useEffect, useCallback } from 'react';
import { useNavigation } from 'expo-router';
import { useTapStampAlert } from '@/contexts/AlertContext';

interface UnsavedChangesOptions {
  isDirty: boolean;
  onSave: () => Promise<boolean>;
}

export function useUnsavedChangesGuard({ isDirty, onSave }: UnsavedChangesOptions) {
  const navigation = useNavigation();
  const alert = useTapStampAlert();

  const confirmLeave = useCallback(
    (onLeave: () => void) => {
      if (!isDirty) {
        onLeave();
        return;
      }

      alert(
        'Unsaved changes',
        'You have unsaved changes. Save them before leaving this screen.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onLeave,
          },
          {
            text: 'Save',
            onPress: () => {
              void (async () => {
                const saved = await onSave();
                if (saved) onLeave();
              })();
            },
          },
        ],
      );
    },
    [isDirty, onSave, alert],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      confirmLeave(() => navigation.dispatch(e.data.action));
    });
    return unsubscribe;
  }, [navigation, isDirty, confirmLeave]);

  return { confirmLeave };
}
