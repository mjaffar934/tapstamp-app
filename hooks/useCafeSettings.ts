import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DoubleStampWindow {
  day: number;
  start: string;
  end: string;
}

export interface CafeSettings {
  id: string;
  name: string;
  reward: string;
  stamp_goal: number;
  minimum_spend: number | null;
  background_color: string | null;
  foreground_color: string | null;
  label_color: string | null;
  show_customer_name_on_pass: boolean;
  collect_customer_details: boolean;
  collect_birthday: boolean;
  stamp_cooldown_hours: number;
  double_stamp_hours: DoubleStampWindow[];
  welcome_message: string | null;
  stamp_message: string | null;
  reward_message: string | null;
  active_campaign_message: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  staff_code?: string | null;
  plan?: string;
  status?: string;
  subscription_status?: import('@/types/database').SubscriptionStatus;
  trial_ends_at?: string | null;
}

const CAFE_SELECT =
  'id, name, reward, stamp_goal, minimum_spend, background_color, foreground_color, label_color, show_customer_name_on_pass, collect_customer_details, collect_birthday, stamp_cooldown_hours, double_stamp_hours, welcome_message, stamp_message, reward_message, active_campaign_message, logo_url, address, city, postcode, staff_code, plan, status, subscription_status, trial_ends_at';

export function useCafeSettings(userEmail: string | undefined) {
  const [cafe, setCafe] = useState<CafeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCafe = useCallback(async () => {
    if (!userEmail) {
      setCafe(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const email = userEmail.toLowerCase();
    const { data, error: fetchError } = await supabase
      .from('cafes')
      .select(CAFE_SELECT)
      .or(`email.eq.${email},owner_email.eq.${email}`)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setCafe(null);
    } else {
      setCafe(data as CafeSettings | null);
    }
    setIsLoading(false);
  }, [userEmail]);

  useEffect(() => {
    fetchCafe();
  }, [fetchCafe]);

  const updateCafe = useCallback(async (updates: Partial<CafeSettings>) => {
    if (!cafe?.id) return { error: 'No cafe linked to this account' };

    setIsSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('cafes')
      .update(updates as never)
      .eq('id', cafe.id);

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return { error: updateError.message };
    }

    setCafe((prev) => (prev ? { ...prev, ...updates } : prev));
    return { error: null };
  }, [cafe?.id]);

  const saveMinimumSpend = useCallback(async (enabled: boolean, amount: number | null) => {
    const minimum_spend = enabled && amount != null && amount > 0 ? amount : null;
    return updateCafe({ minimum_spend });
  }, [updateCafe]);

  const saveCardPreferences = useCallback(async (prefs: {
    show_customer_name_on_pass?: boolean;
    collect_customer_details?: boolean;
    collect_birthday?: boolean;
  }) => updateCafe(prefs), [updateCafe]);

  return {
    cafe,
    isLoading,
    isSaving,
    error,
    refetch: fetchCafe,
    saveMinimumSpend,
    saveCardPreferences,
    updateCafe,
  };
}
