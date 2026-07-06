/**
 * Proxies customer tap flow from tapstamp.co → Supabase edge functions.
 * Fixes Content-Type so branded HTML renders on iPhone Safari.
 *
 * NFC URL: https://tapstamp.co/tap/TS0007
 */

const PROXIED_PREFIXES = [
  '/tap/',
  '/wallet/',
  '/pass/',
  '/google-wallet/',
  '/save-customer',
] as const;

function isProxiedPath(path: string): boolean {
  return PROXIED_PREFIXES.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)
  );
}

export default {
  async fetch(request: Request, env: { SUPABASE_FUNCTIONS_ORIGIN: string }): Promise<Response> {
    const url = new URL(request.url);
    if (!isProxiedPath(url.pathname)) {
      return fetch(request);
    }

    const origin = (env.SUPABASE_FUNCTIONS_ORIGIN || 'https://biootanbxmqfserzgnxe.supabase.co').replace(/\/$/, '');
    const target = `${origin}/functions/v1${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const body = request.method === 'HEAD' ? null : await upstream.arrayBuffer();
    const outHeaders = new Headers(upstream.headers);

    if (body) {
      const head = new TextDecoder().decode(body.slice(0, 32)).trimStart();
      const looksLikeHtml = head.startsWith('<!DOCTYPE') || head.startsWith('<html');
      const contentType = upstream.headers.get('content-type') || '';
      if (looksLikeHtml && !contentType.includes('text/html')) {
        outHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
    }

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
