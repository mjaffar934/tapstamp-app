import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
/** Public proxy for tap HTML + APNs (Railway). e.g. https://api.tapstamp.co */
export const RAILWAY_URL = Deno.env.get('RAILWAY_URL') || '';

export const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export function functionsUrl(path: string): string {
  const base = (
    Deno.env.get('FUNCTIONS_PUBLIC_URL') ||
    Deno.env.get('RAILWAY_URL') ||
    SUPABASE_URL
  ).replace(/\/$/, '');
  const prefix = base.includes('.supabase.co') ? '/functions/v1' : '';
  return `${base}${prefix}${path.startsWith('/') ? path : `/${path}`}`;
}
