import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function monthStartLondon(): string {
  const now = new Date();
  const london = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(london.find((p) => p.type === 'year')?.value);
  const month = Number(london.find((p) => p.type === 'month')?.value);

  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
}

export function useMonthlyUsage(cafeId: string | undefined) {
  const [uniqueCustomers, setUniqueCustomers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!cafeId) {
      setUniqueCustomers(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const start = monthStartLondon();

    const { data, error } = await supabase
      .from('stamps')
      .select('pass_id')
      .eq('cafe_id', cafeId)
      .gte('created_at', start);

    if (error) {
      console.warn('Failed to load monthly usage:', error.message);
      setUniqueCustomers(0);
    } else {
      const rows = (data ?? []) as { pass_id: string }[];
      setUniqueCustomers(new Set(rows.map((row) => row.pass_id)).size);
    }

    setIsLoading(false);
  }, [cafeId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { uniqueCustomers, isLoading, refetch: fetchUsage };
}
