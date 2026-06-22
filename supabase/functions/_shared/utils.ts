export function json(data: unknown, status = 200, req?: Request): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req) Object.assign(headers, corsHeaders(req));
  return new Response(JSON.stringify(data), { status, headers });
}

const WEBSITE_ORIGIN = Deno.env.get('ORDER_WEBSITE_URL') ?? 'https://tapstamp.co';

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  if (!origin) return {};
  const allowed =
    origin === WEBSITE_ORIGIN ||
    origin === 'http://localhost:3000' ||
    origin === 'http://127.0.0.1:3000';
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/** HTML response — use string body (matches tap function; gateway preserves content-type). */
export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function lastPathSegment(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function pathAfter(url: URL, marker: string): string | null {
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return null;
  return url.pathname.slice(idx + marker.length).replace(/^\//, '');
}

export function slugFromEmail(email: string, fallback = 'cafe'): string {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const slug = local.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (slug || fallback).slice(0, 48);
}

export function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function isDoubleStampWindow(
  doubleStampHours: Array<{ day: number; start: string; end: string }> | null | undefined,
): boolean {
  if (!doubleStampHours?.length) return false;
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  return doubleStampHours.some((w) => {
    if (w.day !== day) return false;
    const [sh, sm] = w.start.split(':').map(Number);
    const [eh, em] = w.end.split(':').map(Number);
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    return mins >= start && mins <= end;
  });
}
