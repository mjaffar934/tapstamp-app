import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isCampaignActive } from '@/lib/campaignSchedule';
import type { DashboardStats, LoyaltyActivity } from '@/types/database';

interface DashboardData {
  stats: DashboardStats;
  recentActivity: LoyaltyActivity[];
}

const emptyStats: DashboardStats = {
  totalCustomers: 0,
  newCustomersThisMonth: 0,
  stampsThisWeek: 0,
  redemptionsThisWeek: 0,
  activeCampaigns: 0,
};

const emptyDashboardData: DashboardData = {
  stats: emptyStats,
  recentActivity: [],
};

type RpcStats = {
  total_customers?: number;
  new_customers_this_month?: number;
  stamps_this_week?: number;
  redemptions_this_week?: number;
};

async function fetchStatsViaRpc(cafeId: string): Promise<RpcStats | null> {
  const { data, error } = await supabase.rpc('owner_dashboard_stats', { p_cafe_id: cafeId });
  if (error) return null;
  return (data ?? null) as RpcStats | null;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function fetchStatsDirect(cafeId: string): Promise<RpcStats> {
  const monthStart = startOfMonth();
  const weekStart = startOfWeek();

  const [customersResult, newCustomersResult, stampsResult, redemptionsResult] = await Promise.all([
    supabase.from('passes').select('id', { count: 'exact', head: true }).eq('cafe_id', cafeId),
    supabase
      .from('passes')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .gte('created_at', monthStart),
    supabase
      .from('stamps')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .gte('created_at', weekStart),
    supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .gte('created_at', weekStart),
  ]);

  const firstError =
    customersResult.error ??
    newCustomersResult.error ??
    stampsResult.error ??
    redemptionsResult.error;

  if (firstError) throw new Error(firstError.message);

  return {
    total_customers: customersResult.count ?? 0,
    new_customers_this_month: newCustomersResult.count ?? 0,
    stamps_this_week: stampsResult.count ?? 0,
    redemptions_this_week: redemptionsResult.count ?? 0,
  };
}

async function fetchRecentActivity(cafeId: string): Promise<LoyaltyActivity[]> {
  const [stampActivityResult, redemptionActivityResult] = await Promise.all([
    supabase
      .from('stamps')
      .select('id, created_at, pass_id')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('redemptions')
      .select('id, created_at, pass_id')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (stampActivityResult.error) throw new Error(stampActivityResult.error.message);
  if (redemptionActivityResult.error) throw new Error(redemptionActivityResult.error.message);

  const stampRows = (stampActivityResult.data ?? []) as Array<{
    id: string;
    created_at: string;
    pass_id: string;
  }>;
  const redeemRows = (redemptionActivityResult.data ?? []) as Array<{
    id: string;
    created_at: string;
    pass_id: string;
  }>;

  const passIds = [
    ...new Set([
      ...stampRows.map((row) => row.pass_id),
      ...redeemRows.map((row) => row.pass_id),
    ]),
  ];

  const nameByPassId = new Map<string, string | null>();
  if (passIds.length > 0) {
    const { data: passes, error: passError } = await supabase
      .from('passes')
      .select('id, customer_name')
      .in('id', passIds);

    if (passError) throw new Error(passError.message);

    for (const pass of passes ?? []) {
      nameByPassId.set(
        (pass as { id: string; customer_name: string | null }).id,
        (pass as { id: string; customer_name: string | null }).customer_name,
      );
    }
  }

  return [
    ...stampRows.map((row) => ({
      id: `stamp-${row.id}`,
      type: 'stamp' as const,
      customerName: nameByPassId.get(row.pass_id) ?? null,
      created_at: row.created_at,
    })),
    ...redeemRows.map((row) => ({
      id: `redeem-${row.id}`,
      type: 'redeem' as const,
      customerName: nameByPassId.get(row.pass_id) ?? null,
      created_at: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);
}

export function useDashboard(cafeId: string | undefined) {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtimeIdRef = useRef(`dashboard-rt-${Math.random().toString(36).slice(2, 11)}`);
  const fetchDashboardRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(async () => {});

  const fetchDashboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!cafeId) {
      setData((prev) => (prev === emptyDashboardData ? prev : emptyDashboardData));
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Add your Supabase credentials to .env to load live data.');
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [rpcStats, cafeResult, recentActivity] = await Promise.all([
        fetchStatsViaRpc(cafeId),
        supabase
          .from('cafes')
          .select('active_campaign_message, campaign_starts_at, campaign_ends_at')
          .eq('id', cafeId)
          .maybeSingle(),
        fetchRecentActivity(cafeId),
      ]);

      const statsRow = rpcStats ?? await fetchStatsDirect(cafeId);

      if (cafeResult.error) {
        throw new Error(cafeResult.error.message);
      }

      const cafeData = cafeResult.data as {
        active_campaign_message?: string | null;
        campaign_starts_at?: string | null;
        campaign_ends_at?: string | null;
      } | null;
      const hasActiveCampaign = cafeData ? isCampaignActive(cafeData) : false;

      setData({
        stats: {
          totalCustomers: statsRow.total_customers ?? 0,
          newCustomersThisMonth: statsRow.new_customers_this_month ?? 0,
          stampsThisWeek: statsRow.stamps_this_week ?? 0,
          redemptionsThisWeek: statsRow.redemptions_this_week ?? 0,
          activeCampaigns: hasActiveCampaign ? 1 : 0,
        },
        recentActivity,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [cafeId]);

  fetchDashboardRef.current = fetchDashboard;

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!cafeId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`${realtimeIdRef.current}-${cafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stamps', filter: `cafe_id=eq.${cafeId}` },
        () => { void fetchDashboardRef.current({ silent: true }); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'passes', filter: `cafe_id=eq.${cafeId}` },
        () => { void fetchDashboardRef.current({ silent: true }); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'redemptions', filter: `cafe_id=eq.${cafeId}` },
        () => { void fetchDashboardRef.current({ silent: true }); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cafes', filter: `id=eq.${cafeId}` },
        () => { void fetchDashboardRef.current({ silent: true }); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cafeId]);

  useEffect(() => {
    if (!cafeId) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void fetchDashboardRef.current({ silent: true });
      }
    });

    return () => sub.remove();
  }, [cafeId]);

  const refetch = useCallback(() => fetchDashboard({ silent: true }), [fetchDashboard]);

  return { ...data, isLoading, error, refetch };
}
