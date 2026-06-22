import { supabase } from '../_shared/client.ts';
import { verifyApplePassAuth } from '../_shared/auth.ts';
import { buildPkpass } from '../_shared/pkpass.ts';

function parseSerial(pathname: string): string | null {
  const match = pathname.match(/\/v1\/passes\/[^/]+\/([^/]+)$/);
  return match?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const serial = parseSerial(url.pathname);

    if (!serial) {
      return new Response('Not found', { status: 404 });
    }

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

    const pkpass = await buildPkpass({
      cafe,
      serialNumber: pass.serial_number,
      authToken: pass.auth_token,
      stampCount: pass.stamp_count,
      status: pass.status,
      customerName: pass.customer_name,
    });

    const lastModified = pass.last_stamp_at ?? pass.created_at ?? new Date().toISOString();

    return new Response(pkpass, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date(lastModified).toUTCString(),
      },
    });
  } catch (err) {
    console.error('PassKit pass error:', err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
