import { RAILWAY_URL } from './client.ts';

/** Fallback when Deno native APNs is unavailable — Railway runs @parse/node-apn */
export async function pushUpdate(pushToken: string | null | undefined): Promise<void> {
  if (!pushToken) return;

  const base = Deno.env.get('RAILWAY_URL');
  if (!base) return;

  try {
    await fetch(`${base.replace(/\/$/, '')}/push-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    });
  } catch (e) {
    console.error('Railway push-update error:', e);
  }
}
