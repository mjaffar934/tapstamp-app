import { pemToDer } from './pkcs7.ts';
import { pushUpdate as pushViaRailway } from './railway.ts';

const PASS_TYPE_ID = Deno.env.get('PASS_TYPE_ID') || 'pass.com.tapstamp.loyalty';
const APNS_HOST = Deno.env.get('APNS_PRODUCTION') === 'true'
  ? 'api.push.apple.com'
  : 'api.sandbox.push.apple.com';

let httpClient: Deno.HttpClient | undefined;

function getApnsClient(): Deno.HttpClient | undefined {
  if (httpClient) return httpClient;

  const certPem = Deno.env.get('PASS_CERT');
  const keyPem = Deno.env.get('PASS_KEY');
  if (!certPem || !keyPem) return undefined;

  try {
    httpClient = Deno.createHttpClient({
      certChain: pemToDer(certPem, 'PASS_CERT'),
      privateKey: pemToDer(keyPem, 'PASS_KEY'),
    });
    return httpClient;
  } catch (err) {
    console.error('APNs client init failed:', err);
    return undefined;
  }
}

/** Sends a silent PassKit update push so Wallet re-fetches the pass. */
export async function pushPassUpdate(pushToken: string | null | undefined): Promise<void> {
  if (!pushToken) return;

  const client = getApnsClient();
  if (client) {
    try {
      const res = await fetch(`https://${APNS_HOST}/3/device/${pushToken}`, {
        method: 'POST',
        headers: {
          'apns-topic': PASS_TYPE_ID,
          'apns-push-type': 'background',
          'apns-priority': '5',
          'content-type': 'application/json',
        },
        body: '{}',
        client,
      });

      if (res.ok || res.status === 410) return;
      console.error('APNs push failed:', res.status, await res.text().catch(() => ''));
    } catch (err) {
      console.error('APNs push error:', err);
    }
  }

  await pushViaRailway(pushToken);
}
