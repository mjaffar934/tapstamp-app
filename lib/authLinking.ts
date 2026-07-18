import * as Linking from 'expo-linking';
import { supabase } from './supabase';

function parseHashParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function parseChipCodeFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path ?? '';

    if (path.startsWith('link-chip/')) {
      const code = path.replace('link-chip/', '').split('/')[0];
      return code ? code.toUpperCase() : null;
    }

    if (path === 'link-chip' && parsed.queryParams?.code) {
      return String(parsed.queryParams.code).toUpperCase();
    }

    const tapMatch = url.match(/\/tap\/([^/?#]+)/i);
    if (tapMatch?.[1]) {
      return tapMatch[1].toUpperCase();
    }

    return null;
  } catch {
    return null;
  }
}

export async function handleAuthDeepLink(url: string): Promise<'recovery' | 'default' | null> {
  const parsed = Linking.parse(url);
  const hashParams = parseHashParams(url);
  const queryCode = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
  const type = hashParams.type
    ?? (typeof parsed.queryParams?.type === 'string' ? parsed.queryParams.type : undefined);

  if (queryCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(queryCode);
    if (error) {
      console.warn('Failed to exchange auth code from deep link:', error.message);
      return null;
    }
    return type === 'recovery' ? 'recovery' : 'default';
  }

  const accessToken = hashParams.access_token;
  const refreshToken = hashParams.refresh_token;

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn('Failed to set session from deep link:', error.message);
      return null;
    }
    return type === 'recovery' ? 'recovery' : 'default';
  }

  return null;
}

type DeepLinkHandlers = {
  onRecovery: () => void;
  onChipCode?: (code: string) => void;
};

export function subscribeToDeepLinks({ onRecovery, onChipCode }: DeepLinkHandlers): () => void {
  const handleUrl = async (url: string) => {
    const chipCode = parseChipCodeFromUrl(url);
    if (chipCode && onChipCode) {
      onChipCode(chipCode);
      return;
    }

    const result = await handleAuthDeepLink(url);
    if (result === 'recovery') onRecovery();
  };

  Linking.getInitialURL().then((url) => {
    if (url) handleUrl(url);
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleUrl(url);
  });

  return () => subscription.remove();
}
