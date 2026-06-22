import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { createKey } from './jwt.ts';

export interface CafeJwtPayload {
  cafeId: string;
  email?: string;
}

export async function verifyCafeJwt(
  authHeader: string | null,
): Promise<CafeJwtPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const secret = Deno.env.get('JWT_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) return null;

  try {
    const key = await createKey(secret);
    const payload = await verify(token, key) as CafeJwtPayload & { exp?: number };
    if (!payload.cafeId) return null;
    return { cafeId: payload.cafeId, email: payload.email };
  } catch {
    return null;
  }
}

export function requireCafeAuth(
  authHeader: string | null,
  cafeIdFromPath: string,
): Promise<Response | CafeJwtPayload> {
  return verifyCafeJwt(authHeader).then((payload) => {
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (payload.cafeId !== cafeIdFromPath) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return payload;
  });
}

export async function verifyApplePassAuth(
  authHeader: string | null,
  serialNumber: string,
): Promise<boolean> {
  if (!authHeader?.startsWith('ApplePass ')) return false;
  const token = authHeader.slice('ApplePass '.length);

  const { supabase } = await import('./client.ts');
  const { data } = await supabase
    .from('passes')
    .select('auth_token')
    .eq('serial_number', serialNumber)
    .maybeSingle();

  return !!data && data.auth_token === token;
}
