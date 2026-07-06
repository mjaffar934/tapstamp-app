/**
 * Cloudflare Pages middleware — proxies customer tap flow to Supabase.
 * Fixes Content-Type so branded HTML renders on iPhone Safari.
 *
 * Deploy with the website/ folder on Cloudflare Pages.
 * Routes: /tap/*, /wallet/*, /pass/*, /google-wallet/*, /save-customer
 */

const SUPABASE_ORIGIN = 'https://biootanbxmqfserzgnxe.supabase.co';

const PROXIED_PREFIXES = [
  '/tap/',
  '/wallet/',
  '/pass/',
  '/google-wallet/',
  '/save-customer',
];

function isProxiedPath(path: string): boolean {
  return PROXIED_PREFIXES.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)
  );
}

async function proxyToSupabase(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = `${SUPABASE_ORIGIN}/functions/v1${url.pathname}${url.search}`;

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
}

export async function onRequest(context: { request: Request; next: () => Promise<Response> }) {
  const path = new URL(context.request.url).pathname;
  if (!isProxiedPath(path)) {
    return context.next();
  }
  return proxyToSupabase(context.request);
}
