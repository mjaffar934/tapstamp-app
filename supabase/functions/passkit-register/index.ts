import { supabase } from '../_shared/client.ts';
import { verifyApplePassAuth } from '../_shared/auth.ts';
import { buildPkpass } from '../_shared/pkpass.ts';
import { json } from '../_shared/utils.ts';

// Apple PassKit web service — registrations AND pass updates share one base URL.

function passkitSubpath(pathname: string): string {
  const idx = pathname.indexOf('/v1/');
  return idx >= 0 ? pathname.slice(idx) : pathname;
}

function parseRegistrationPath(subpath: string) {
  const match = subpath.match(
    /^\/v1\/devices\/([^/]+)\/registrations\/([^/]+)(?:\/([^/]+))?$/,
  );
  if (!match) return null;
  return {
    deviceId: match[1],
    passTypeId: match[2],
    serialNumber: match[3] ?? null,
  };
}

function parsePassFetchPath(subpath: string): string | null {
  const match = subpath.match(/^\/v1\/passes\/[^/]+\/([^/]+)$/);
  return match?.[1] ?? null;
}

async function servePass(serial: string, req: Request): Promise<Response> {
  const authorized = await verifyApplePassAuth(
    req.headers.get('Authorization'),
    serial,
  );
  if (!authorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: pass } = await supabase
    .from('passes')
    .select('*')
    .eq('serial_number', serial)
    .single();

  if (!pass) {
    return new Response('Not found', { status: 404 });
  }

  const { data: cafe } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', pass.cafe_id)
    .single();

  if (!cafe) {
    return new Response('Not found', { status: 404 });
  }

  const { data: tiers } = await supabase
    .from('reward_tiers')
    .select('stamp_count, reward')
    .eq('cafe_id', pass.cafe_id)
    .order('stamp_count');

  const pkpass = await buildPkpass({
    cafe,
    serialNumber: pass.serial_number,
    authToken: pass.auth_token,
    stampCount: pass.stamp_count,
    status: pass.status,
    customerName: pass.customer_name,
    lifetimeStamps: pass.lifetime_stamps,
    tiers: tiers ?? [],
  });

  const lastModified = pass.last_stamp_at ?? pass.created_at ?? new Date().toISOString();

  return new Response(pkpass, {
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Last-Modified': new Date(lastModified).toUTCString(),
    },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const subpath = passkitSubpath(url.pathname);

    const passSerial = parsePassFetchPath(subpath);
    if (passSerial && req.method === 'GET') {
      return await servePass(passSerial, req);
    }

    const parsed = parseRegistrationPath(subpath);
    if (!parsed) {
      return new Response('Not found', { status: 404 });
    }

    const { deviceId, passTypeId, serialNumber } = parsed;

    if (req.method === 'GET' && !serialNumber) {
      const { data: passes } = await supabase
        .from('passes')
        .select('serial_number, last_stamp_at, created_at')
        .eq('device_id', deviceId);

      const serialNumbers = (passes ?? []).map((p) => p.serial_number);
      const lastUpdated = passes?.length
        ? new Date(
          Math.max(
            ...passes.map((p) =>
              new Date(p.last_stamp_at ?? p.created_at ?? 0).getTime()
            ),
          ),
        ).toISOString()
        : new Date().toISOString();

      return json({ lastUpdated, serialNumbers });
    }

    if (!serialNumber) {
      return new Response('Not found', { status: 404 });
    }

    const authorized = await verifyApplePassAuth(
      req.headers.get('Authorization'),
      serialNumber,
    );
    if (!authorized) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const pushToken = body.pushToken as string | undefined;
      if (!pushToken) {
        return new Response('pushToken required', { status: 400 });
      }

      const { data: existing } = await supabase
        .from('passes')
        .select('id, push_token')
        .eq('serial_number', serialNumber)
        .single();

      await supabase
        .from('passes')
        .update({ push_token: pushToken, device_id: deviceId })
        .eq('serial_number', serialNumber);

      return new Response(null, { status: existing?.push_token ? 200 : 201 });
    }

    if (req.method === 'DELETE') {
      await supabase
        .from('passes')
        .update({ push_token: null, device_id: null })
        .eq('serial_number', serialNumber)
        .eq('device_id', deviceId);

      return new Response(null, { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    console.error('PassKit register error:', err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
