import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';

export async function createKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signCafeToken(
  cafeId: string,
  email: string,
): Promise<string> {
  const secret = Deno.env.get('JWT_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const key = await createKey(secret);
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    { cafeId, email, exp: getNumericDate(60 * 60 * 24 * 30) },
    key,
  );
}
