import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

export function useDashboard(cafeId: string | undefined) {
  const [data, setData] = useState<DashboardData>({ stats: emptyStats, recentActivity: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!cafeId) {
      setData({ stats: emptyStats, recentActivity: [] });
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

    try {
      const monthStart = startOfMonth();
      const weekStart = startOfWeek();

      const [
        customersResult,
        newCustomersResult,
        stampsResult,
        redemptionsResult,
        cafeResult,
        stampActivityResult,
        redemptionActivityResult,
      ] = await Promise.all([
        supabase
          .from('passes')
          .select('id', { count: 'exact', head: true })
          .eq('cafe_id', cafeId),
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
        supabase
          .from('cafes')
          .select('active_campaign_message')
          .eq('id', cafeId)
          .maybeSingle(),
        supabase
          .from('stamps')
          .select('id, created_at, pass:passes(customer_name)')
          .eq('cafe_id', cafeId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('redemptions')
          .select('id, created_at, pass:passes(customer_name)')
          .eq('cafe_id', cafeId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const firstError =
        customersResult.error ??
        newCustomersResult.error ??
        stampsResult.error ??
        redemptionsResult.error ??
        cafeResult.error ??
        stampActivityResult.error ??
        redemptionActivityResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      type ActivityRow = {
        id: string;
        created_at: string;
        pass: { customer_name: string | null } | null;
      };

      const stampRows = (stampActivityResult.data ?? []) as ActivityRow[];
      const redeemRows = (redemptionActivityResult.data ?? []) as ActivityRow[];

      const recentActivity: LoyaltyActivity[] = [
        ...stampRows.map((row) => ({
          id: `stamp-${row.id}`,
          type: 'stamp' as const,
          customerName: row.pass?.customer_name ?? null,
          created_at: row.created_at,
        })),
        ...redeemRows.map((row) => ({
          id: `redeem-${row.id}`,
          type: 'redeem' as const,
          customerName: row.pass?.customer_name ?? null,
          created_at: row.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);

      const cafeData = cafeResult.data as { active_campaign_message?: string | null } | null;
      const hasActiveCampaign = Boolean(cafeData?.active_campaign_message);

      setData({
        stats: {
          totalCustomers: customersResult.count ?? 0,
          newCustomersThisMonth: newCustomersResult.count ?? 0,
          stampsThisWeek: stampsResult.count ?? 0,
          redemptionsThisWeek: redemptionsResult.count ?? 0,
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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { ...data, isLoading, error, refetch: fetchDashboard };
}
