import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { TapStampAlert, type TapStampAlertButton } from '@/components/ui/TapStampAlert';

type AlertFn = (title: string, message?: string, buttons?: TapStampAlertButton[]) => void;

interface AlertState {
  title: string;
  message?: string;
  buttons: TapStampAlertButton[];
}

const AlertContext = createContext<AlertFn | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  const alert: AlertFn = useCallback((title, message, buttons) => {
    setState({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    });
  }, []);

  const dismiss = useCallback(() => setState(null), []);

  const value = useMemo(() => alert, [alert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <TapStampAlert
        visible={state != null}
        title={state?.title ?? ''}
        message={state?.message}
        buttons={state?.buttons ?? []}
        onDismiss={dismiss}
      />
    </AlertContext.Provider>
  );
}

export function useTapStampAlert(): AlertFn {
  const alert = useContext(AlertContext);
  if (!alert) {
    throw new Error('useTapStampAlert must be used within AlertProvider');
  }
  return alert;
}
