import { supabase } from './client.ts';

/** Start of current calendar month in Europe/London */
export function monthStartLondon(): Date {
  const now = new Date();
  const london = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(london.find((p) => p.type === 'year')?.value);
  const month = Number(london.find((p) => p.type === 'month')?.value);

  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
}

/** Unique pass holders with at least one stamp this calendar month (London). */
export async function countUniqueMonthlyCustomers(cafeId: string): Promise<number> {
  const start = monthStartLondon().toISOString();

  const { data, error } = await supabase
    .from('stamps')
    .select('pass_id')
    .eq('cafe_id', cafeId)
    .gte('created_at', start);

  if (error) {
    console.error('Usage count error:', error.message);
    return 0;
  }

  const unique = new Set((data ?? []).map((row) => row.pass_id));
  return unique.size;
}
