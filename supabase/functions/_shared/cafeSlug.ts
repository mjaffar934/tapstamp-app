import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Pick a slug that is not already used in `cafes.slug`. */
export async function ensureUniqueSlug(
  db: SupabaseClient,
  baseSlug: string,
): Promise<string> {
  const stem = baseSlug.slice(0, 48).replace(/-+$/g, '') || 'cafe';

  for (let attempt = 0; attempt < 25; attempt++) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${stem.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;

    const { data } = await db
      .from('cafes')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  return `${stem.slice(0, 32)}-${crypto.randomUUID().slice(0, 8)}`;
}
