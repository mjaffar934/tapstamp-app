import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';

/** Whether the signed-in owner has a cafe with at least one linked TapStamp chip. */
export function useStampLinkStatus() {
  const { cafe, isLoading: cafeLoading, refetch: refetchCafe } = useOwnerCafe();
  const [chipCode, setChipCode] = useState<string | null>(null);
  const [chipLoading, setChipLoading] = useState(true);

  const loadChip = useCallback(async (cafeId: string | undefined) => {
    if (!cafeId) {
      setChipCode(null);
      setChipLoading(false);
      return;
    }

    setChipLoading(true);
    const { data } = await supabase
      .from('chips')
      .select('code')
      .eq('cafe_id', cafeId)
      .limit(1)
      .maybeSingle();

    setChipCode((data as { code: string } | null)?.code ?? null);
    setChipLoading(false);
  }, []);

  useEffect(() => {
    void loadChip(cafe?.id);
  }, [cafe?.id, loadChip]);

  const refetch = useCallback(async () => {
    await refetchCafe();
    // cafe id may update after refetch — loadChip runs via effect
  }, [refetchCafe]);

  const isLoading = cafeLoading || chipLoading;
  const needsLink = !isLoading && (!cafe || !chipCode);

  return { needsLink, cafe, chipCode, isLoading, refetch };
}
