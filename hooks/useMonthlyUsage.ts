import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  const realtimeIdRef = useRef(`usage-rt-${Math.random().toString(36).slice(2, 11)}`);
  const fetchUsageRef = useRef<() => Promise<void>>(async () => {});

  const fetchUsage = useCallback(async (options?: { silent?: boolean }) => {
    if (!cafeId) {
      setUniqueCustomers(0);
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }

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

  fetchUsageRef.current = fetchUsage;

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (!cafeId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`${realtimeIdRef.current}-${cafeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stamps', filter: `cafe_id=eq.${cafeId}` },
        () => { void fetchUsageRef.current({ silent: true }); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'passes', filter: `cafe_id=eq.${cafeId}` },
        () => { void fetchUsageRef.current({ silent: true }); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cafeId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void fetchUsageRef.current({ silent: true });
      }
    });

    return () => sub.remove();
  }, []);

  const refetch = useCallback(() => fetchUsage({ silent: true }), [fetchUsage]);

  return { uniqueCustomers, isLoading, refetch };
}
