import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface PassDetail {
  id: string;
  serial_number: string;
  customer_name: string | null;
  customer_email: string | null;
  stamp_count: number;
  lifetime_stamps: number;
  status: string;
  last_stamp_at: string | null;
  created_at: string;
  cafe_id: string;
}

export interface PassStamp {
  id: string;
  created_at: string;
}

export interface PassRedemption {
  id: string;
  created_at: string;
}

export function usePass(passId: string | undefined) {
  const [pass, setPass] = useState<PassDetail | null>(null);
  const [stamps, setStamps] = useState<PassStamp[]>([]);
  const [redemptions, setRedemptions] = useState<PassRedemption[]>([]);
  const [stampGoal, setStampGoal] = useState(10);
  const [reward, setReward] = useState('Free coffee');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPass = useCallback(async () => {
    if (!passId) {
      setPass(null);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data: passData, error: passError } = await supabase
      .from('passes')
      .select('*')
      .eq('id', passId)
      .maybeSingle();

    if (passError || !passData) {
      setError(passError?.message ?? 'Pass not found');
      setPass(null);
      setIsLoading(false);
      return;
    }

    const typedPass = passData as PassDetail;
    setPass(typedPass);

    const [stampsResult, redemptionsResult, cafeResult] = await Promise.all([
      supabase
        .from('stamps')
        .select('id, created_at')
        .eq('pass_id', passId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('redemptions')
        .select('id, created_at')
        .eq('pass_id', passId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('cafes')
        .select('stamp_goal, reward')
        .eq('id', typedPass.cafe_id)
        .maybeSingle(),
    ]);

    setStamps((stampsResult.data ?? []) as PassStamp[]);
    setRedemptions((redemptionsResult.data ?? []) as PassRedemption[]);
    if (cafeResult.data) {
      const cafeMeta = cafeResult.data as { stamp_goal?: number; reward?: string };
      setStampGoal(cafeMeta.stamp_goal ?? 10);
      setReward(cafeMeta.reward ?? 'Free coffee');
    }

    setIsLoading(false);
  }, [passId]);

  useEffect(() => {
    fetchPass();
  }, [fetchPass]);

  return {
    pass,
    stamps,
    redemptions,
    stampGoal,
    reward,
    isLoading,
    error,
    refetch: fetchPass,
  };
}
