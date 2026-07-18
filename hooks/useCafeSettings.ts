import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  pass_template: string | null;
  show_customer_name_on_pass: boolean;
  collect_customer_details: boolean;
  collect_name_only: boolean;
  collect_birthday: boolean;
  stamp_cooldown_hours: number;
  double_stamp_hours: DoubleStampWindow[];
  welcome_message: string | null;
  stamp_message: string | null;
  reward_message: string | null;
  active_campaign_message: string | null;
  campaign_starts_at: string | null;
  campaign_ends_at: string | null;
  logo_url: string | null;
  strip_image_url?: string | null;
  pass_design_quiz?: Record<string, unknown> | null;
  pass_design_locked_at?: string | null;
  pass_design_mode?: 'classic' | 'ai' | null;
  ai_background_color?: string | null;
  ai_foreground_color?: string | null;
  ai_label_color?: string | null;
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
  'id, name, reward, stamp_goal, minimum_spend, background_color, foreground_color, label_color, pass_template, show_customer_name_on_pass, collect_customer_details, collect_name_only, collect_birthday, stamp_cooldown_hours, double_stamp_hours, welcome_message, stamp_message, reward_message, active_campaign_message, campaign_starts_at, campaign_ends_at, logo_url, strip_image_url, pass_design_quiz, pass_design_locked_at, pass_design_mode, ai_background_color, ai_foreground_color, ai_label_color, address, city, postcode, staff_code, plan, status, subscription_status, trial_ends_at';

interface CafeLookup {
  userId?: string;
  userEmail?: string;
}

export function useCafeSettings({ userId, userEmail }: CafeLookup) {
  const [cafe, setCafe] = useState<CafeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeIdRef = useRef(`cafe-rt-${Math.random().toString(36).slice(2, 11)}`);
  const fetchCafeRef = useRef<() => Promise<void>>(async () => {});

  const fetchCafe = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId && !userEmail) {
      setCafe(null);
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    if (userId) {
      const { data, error: ownerError } = await supabase
        .from('cafes')
        .select(CAFE_SELECT)
        .eq('owner_id', userId)
        .maybeSingle();

      if (ownerError) {
        setError(ownerError.message);
        setCafe(null);
        setIsLoading(false);
        return;
      }

      if (data) {
        setCafe(data as CafeSettings);
        setIsLoading(false);
        return;
      }
    }

    if (userEmail) {
      const email = userEmail.toLowerCase();
      const { data, error: fetchError } = await supabase
        .from('cafes')
        .select(CAFE_SELECT)
        .eq('email', email)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setCafe(null);
      } else {
        setCafe(data as CafeSettings | null);
      }
      setIsLoading(false);
      return;
    }

    setCafe(null);
    setIsLoading(false);
  }, [userId, userEmail]);

  fetchCafeRef.current = fetchCafe;

  useEffect(() => {
    void fetchCafe();
  }, [fetchCafe]);

  useFocusEffect(
    useCallback(() => {
      void fetchCafeRef.current({ silent: true });
    }, []),
  );

  useEffect(() => {
    if (!cafe?.id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`${realtimeIdRef.current}-${cafe.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cafes', filter: `id=eq.${cafe.id}` },
        () => { void fetchCafeRef.current({ silent: true }); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cafe?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void fetchCafeRef.current({ silent: true });
      }
    });

    return () => sub.remove();
  }, []);

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
    collect_name_only?: boolean;
    collect_birthday?: boolean;
  }) => updateCafe(prefs), [updateCafe]);

  const refetch = useCallback(() => fetchCafe({ silent: true }), [fetchCafe]);

  return {
    cafe,
    isLoading,
    isSaving,
    error,
    refetch,
    saveMinimumSpend,
    saveCardPreferences,
    updateCafe,
  };
}
