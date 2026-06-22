import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface CustomerPass {
  id: string;
  serial_number: string;
  customer_name: string | null;
  customer_email: string | null;
  stamp_count: number;
  lifetime_stamps: number;
  status: string;
  last_stamp_at: string | null;
  created_at: string;
}

export function useCustomers(cafeId: string | undefined) {
  const [customers, setCustomers] = useState<CustomerPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!cafeId) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Add your Supabase credentials to .env to load live data.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('passes')
      .select(
        'id, serial_number, customer_name, customer_email, stamp_count, lifetime_stamps, status, last_stamp_at, created_at',
      )
      .eq('cafe_id', cafeId)
      .order('last_stamp_at', { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setCustomers([]);
    } else {
      setCustomers((data ?? []) as CustomerPass[]);
    }
    setIsLoading(false);
  }, [cafeId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, isLoading, error, refetch: fetchCustomers };
}
