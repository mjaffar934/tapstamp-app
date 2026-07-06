import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

export const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/** Always hits Supabase directly — used when custom-domain proxy lacks a route. */
export function supabaseFunctionsUrl(path: string): string {
  const base = SUPABASE_URL.replace(/\/$/, '');
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}/functions/v1${segment}`;
}

/** Public base for tap/wallet links embedded in HTML and passes. */
export function functionsUrl(path: string): string {
  const base = (
    Deno.env.get('FUNCTIONS_PUBLIC_URL') ||
    SUPABASE_URL
  ).replace(/\/$/, '');
  const segment = path.startsWith('/') ? path : `/${path}`;
  // Custom domain (e.g. tapstamp.co) is proxied at /tap, /wallet — not /functions/v1/...
  if (!base.includes('supabase.co')) {
    return `${base}${segment}`;
  }
  return `${base}/functions/v1${segment}`;
}
