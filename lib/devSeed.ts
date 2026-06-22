const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

export async function seedDevMockData(
  email: string,
  secret: string,
): Promise<{ error: string | null; seeded?: number }> {
  if (!supabaseUrl) {
    return { error: 'Supabase URL is not configured' };
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/dev-seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, secret }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data as { error?: string }).error ?? 'Dev seed failed' };
  }

  return { error: null, seeded: (data as { seeded?: number }).seeded };
}
