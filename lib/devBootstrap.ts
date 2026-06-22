const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

export async function bootstrapDevAccount(
  email: string,
  password: string,
  secret: string,
): Promise<{ error: string | null }> {
  if (!supabaseUrl) {
    return { error: 'Supabase URL is not configured' };
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/dev-bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, secret }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data as { error?: string }).error ?? 'Dev bootstrap failed' };
  }

  return { error: null };
}
