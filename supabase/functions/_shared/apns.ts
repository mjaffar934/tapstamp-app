import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { pemToDer } from './pkcs7.ts';

const PASS_TYPE_ID = Deno.env.get('PASS_TYPE_ID') || 'pass.com.tapstamp.loyalty';
const APNS_HOST = Deno.env.get('APNS_PRODUCTION') === 'false'
  ? 'api.sandbox.push.apple.com'
  : 'api.push.apple.com';

let certHttpClient: Deno.HttpClient | undefined;
let tokenJwt: { value: string; expiresAt: number } | undefined;

function normalizePem(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '\n').trim();
}

function getCertApnsClient(): Deno.HttpClient | undefined {
  if (certHttpClient) return certHttpClient;

  const certPem = normalizePem(Deno.env.get('PASS_CERT'));
  const keyPem = normalizePem(Deno.env.get('PASS_KEY'));
  if (!certPem || !keyPem) return undefined;

  try {
    certHttpClient = Deno.createHttpClient({
      certChain: pemToDer(certPem, 'PASS_CERT'),
      privateKey: pemToDer(keyPem, 'PASS_KEY'),
    });
    return certHttpClient;
  } catch (err) {
    console.error('APNs cert client init failed:', err);
    return undefined;
  }
}

function pemPkcs8ToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getTokenJwt(): Promise<string | undefined> {
  const apnKey = normalizePem(Deno.env.get('APN_KEY'));
  const apnKeyId = Deno.env.get('APN_KEY_ID');
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  if (!apnKey || !apnKeyId || !teamId) return undefined;

  const now = Math.floor(Date.now() / 1000);
  if (tokenJwt && tokenJwt.expiresAt > now + 60) {
    return tokenJwt.value;
  }

  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemPkcs8ToArrayBuffer(apnKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );

    const jwt = await create(
      { alg: 'ES256', typ: 'JWT', kid: apnKeyId },
      { iss: teamId, iat: getNumericDate(0) },
      key,
    );

    tokenJwt = { value: jwt, expiresAt: now + 3000 };
    return jwt;
  } catch (err) {
    console.error('APNs token JWT init failed:', err);
    return undefined;
  }
}

async function sendApns(pushToken: string): Promise<boolean> {
  const url = `https://${APNS_HOST}/3/device/${pushToken}`;
  const headers: Record<string, string> = {
    'apns-topic': PASS_TYPE_ID,
    'apns-push-type': 'background',
    'apns-priority': '5',
    'content-type': 'application/json',
  };

  const certClient = getCertApnsClient();
  if (certClient) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: '{}',
      client: certClient,
    });
    if (res.ok || res.status === 410) return true;
    console.error('APNs cert push failed:', res.status, await res.text().catch(() => ''));
    return false;
  }

  const jwt = await getTokenJwt();
  if (jwt) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, authorization: `bearer ${jwt}` },
      body: '{}',
    });
    if (res.ok || res.status === 410) return true;
    console.error('APNs token push failed:', res.status, await res.text().catch(() => ''));
    return false;
  }

  console.warn('APNs not configured — set PASS_CERT/PASS_KEY or APN_KEY/APN_KEY_ID/APPLE_TEAM_ID');
  return false;
}

async function pushViaRailway(pushToken: string): Promise<boolean> {
  const base = Deno.env.get('FUNCTIONS_PUBLIC_URL');
  if (!base || base.includes('supabase.co')) return false;

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/push-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    });
    if (res.ok) return true;
    console.error('Railway push-update failed:', res.status, await res.text().catch(() => ''));
    return false;
  } catch (err) {
    console.error('Railway push-update error:', err);
    return false;
  }
}

/** Sends a silent PassKit update push so Wallet re-fetches the pass. */
export async function pushPassUpdate(pushToken: string | null | undefined): Promise<void> {
  if (!pushToken) {
    console.warn('Wallet push skipped: no push_token on pass (device not registered with PassKit)');
    return;
  }

  const [railway, direct] = await Promise.allSettled([
    pushViaRailway(pushToken),
    sendApns(pushToken),
  ]);

  const railwayOk = railway.status === 'fulfilled' && railway.value === true;
  const directOk = direct.status === 'fulfilled' && direct.value === true;

  if (!railwayOk && !directOk) {
    console.error('All APNs push paths failed for token', pushToken.slice(0, 12));
  }
}
