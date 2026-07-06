import { useCallback, useEffect, useState } from 'react';

import { publicEdgeHeaders } from '@/lib/api';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

export interface BaristaPass {
  id: string;
  serial_number: string;
  customer_name: string | null;
  stamp_count: number;
  status: string;
  last_stamp_at: string | null;
}

export interface BaristaData {
  passes: BaristaPass[];
  stampsToday: number;
  rewardReady: number;
  stampGoal: number;
  minimumSpend: number | null;
}

export function useBaristaData(cafeId: string | undefined) {
  const [data, setData] = useState<BaristaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!cafeId || !supabaseUrl) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/barista/${cafeId}`, {
        headers: publicEdgeHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load barista data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
