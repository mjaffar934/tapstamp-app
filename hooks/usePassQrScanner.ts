import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTapStampAlert } from '@/contexts/AlertContext';

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

/** Short member codes shown on the pass (usually 4 digits). */
export function parseMemberCodeFromQr(data: string): string | null {
  const trimmed = data.trim();
  if (/^\d{4,8}$/.test(trimmed)) return trimmed;
  const labeled = trimmed.match(/(?:member|code)[#:\s]*(\d{4,8})/i);
  return labeled?.[1] ?? null;
}

interface UsePassQrScannerOptions {
  onSerial: (serial: string) => void;
  onMemberCode?: (code: string) => void;
}

export function usePassQrScanner({ onSerial, onMemberCode }: UsePassQrScannerOptions) {
  const [permission, requestPermission] = useCameraPermissions();
  const serialRef = useRef(onSerial);
  const codeRef = useRef(onMemberCode);
  const alert = useTapStampAlert();
  serialRef.current = onSerial;
  codeRef.current = onMemberCode;

  useEffect(() => {
    if (!CameraView.onModernBarcodeScanned) return undefined;

    const subscription = CameraView.onModernBarcodeScanned(({ data }) => {
      const serial = parsePassSerialFromQr(data);
      if (serial) {
        serialRef.current(serial);
        return;
      }
      const code = parseMemberCodeFromQr(data);
      if (code && codeRef.current) {
        codeRef.current(code);
        return;
      }
      alert(
        'Not a customer pass',
        'Scan the QR on the customer\'s Wallet pass, or search by their member code.',
      );
    });

    return () => subscription.remove();
  }, []);

  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert(
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

    alert(
      'Scanner unavailable',
      Platform.OS === 'web'
        ? 'QR scanning is not supported in the browser.'
        : 'Rebuild the app with expo-camera, or search by member code below.',
    );
  }, [permission?.granted, requestPermission]);

  return { openScanner, hasPermission: permission?.granted ?? false };
}
