import { supabase } from '../_shared/client.ts';
import { verifyApplePassAuth } from '../_shared/auth.ts';
import { buildPkpass } from '../_shared/pkpass.ts';
import { ensureMemberCode } from '../_shared/memberCode.ts';
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
    memberCode: await ensureMemberCode(pass, String(pass.cafe_id)),
    lifetimeStamps: pass.lifetime_stamps,
    tiers: tiers ?? [],
    pendingMilestoneReward: pass.pending_milestone_reward ?? null,
  });

  const lastModified = pass.updated_at ?? pass.last_stamp_at ?? pass.created_at ?? new Date().toISOString();
  const lastModifiedDate = new Date(lastModified);
  const ifModifiedSince = req.headers.get('If-Modified-Since');
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince).getTime();
    if (Number.isFinite(since) && lastModifiedDate.getTime() <= since) {
      return new Response(null, { status: 304 });
    }
  }

  return new Response(pkpass, {
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Last-Modified': lastModifiedDate.toUTCString(),
      'Cache-Control': 'no-store',
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
      const passesUpdatedSince = url.searchParams.get('passesUpdatedSince');

      const { data: passes } = await supabase
        .from('passes')
        .select('serial_number, last_stamp_at, updated_at, created_at')
        .eq('device_id', deviceId);

      const rows = passes ?? [];
      const updatedSinceMs = passesUpdatedSince
        ? new Date(passesUpdatedSince).getTime()
        : null;

      const changed = updatedSinceMs != null && Number.isFinite(updatedSinceMs)
        ? rows.filter((p) => {
          const updated = new Date(p.updated_at ?? p.last_stamp_at ?? p.created_at ?? 0).getTime();
          return updated > updatedSinceMs;
        })
        : rows;

      if (changed.length === 0) {
        return new Response(null, { status: 204 });
      }

      const serialNumbers = changed.map((p) => p.serial_number);
      const lastUpdated = new Date(
        Math.max(
          ...changed.map((p) =>
            new Date(p.updated_at ?? p.last_stamp_at ?? p.created_at ?? 0).getTime()
          ),
        ),
      ).toISOString();

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
        .update({
          push_token: pushToken,
          device_id: deviceId,
          wallet_added_at: new Date().toISOString(),
        })
        .eq('serial_number', serialNumber);

      console.log('PassKit registered:', serialNumber, 'device', deviceId.slice(0, 8));

      return new Response(null, { status: existing?.push_token ? 200 : 201 });
    }

    if (req.method === 'DELETE') {
      await supabase
        .from('passes')
        .update({
          push_token: null,
          device_id: null,
          wallet_added_at: null,
        })
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
