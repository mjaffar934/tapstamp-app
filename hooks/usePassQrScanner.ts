import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

/** Extract a pass serial from wallet QR content (raw UUID or encoded URL). */
export function parsePassSerialFromQr(data: string): string | null {
  const trimmed = data.trim();
  if (!trimmed) return null;

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (uuidMatch) return uuidMatch[0].toLowerCase();

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
        return part.toLowerCase();
      }
    }
    // Tap / pass URLs — last segment may be chip code, not a pass serial
    if (parts.some((p) => p === 'tap' || p === 'pass' || p === 'wallet')) {
      return null;
    }
  } catch {
    // not a URL
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

interface UsePassQrScannerOptions {
  onSerial: (serial: string) => void;
}

export function usePassQrScanner({ onSerial }: UsePassQrScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const handlerRef = useRef(onSerial);
  handlerRef.current = onSerial;

  useEffect(() => {
    if (!CameraView.onModernBarcodeScanned) return undefined;

    const subscription = CameraView.onModernBarcodeScanned(({ data }) => {
      const serial = parsePassSerialFromQr(data);
      if (!serial) {
        Alert.alert(
          'Not a customer pass',
          'Scan the QR on the customer\'s Google Wallet loyalty pass. Your cafe tap-link QR won\'t work here.',
        );
        return;
      }
      handlerRef.current(serial);
    });

    return () => subscription.remove();
  }, []);

  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera needed',
          'Allow camera access to scan a customer\'s wallet pass QR code.',
        );
        return;
      }
    }

    if (CameraView.isModernBarcodeScannerAvailable && CameraView.launchScanner) {
      try {
        await CameraView.launchScanner({ barcodeTypes: ['qr'] });
        return;
      } catch (err) {
        console.warn('Native scanner failed, falling back:', err);
      }
    }

    Alert.alert(
      'Scanner unavailable',
      Platform.OS === 'web'
        ? 'QR scanning is not supported in the browser.'
        : 'Rebuild the app with expo-camera, or paste the pass serial below.',
    );
  }, [permission?.granted, requestPermission]);

  return { openScanner, hasPermission: permission?.granted ?? false };
}
