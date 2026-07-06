import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { router } from 'expo-router';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToDeepLinks } from '@/lib/authLinking';
import { ownerSignup, provisionCafe } from '@/lib/api';
import { bootstrapDevAccount } from '@/lib/devBootstrap';
import { clearStaffSession } from '@/lib/staffSession';
import type { Business } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  businessLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, businessName: string) => Promise<{ error: string | null }>;
  signInDev: (email: string, password: string, bootstrapSecret: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businessLoading, setBusinessLoading] = useState(false);

  const fetchBusiness = useCallback(async (userId: string): Promise<Business | null> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch business:', error.message);
      setBusiness(null);
      return null;
    }

    setBusiness(data);
    return data;
  }, []);

  const ensureCafeLinked = useCallback(async (user: User, biz: Business | null) => {
    if (!user.email || !biz || biz.onboarding_status === 'pending_activation') return;

    await provisionCafe({
      name: biz.name,
      biz_type: biz.business_type ?? undefined,
      background_color: biz.background_color ?? undefined,
      foreground_color: biz.foreground_color ?? undefined,
      label_color: biz.label_color ?? undefined,
      show_customer_name_on_pass: biz.show_customer_name_on_pass,
    });
  }, []);

  const refreshBusiness = useCallback(async () => {
    if (!session?.user?.id) {
      setBusiness(null);
      return;
    }
    await fetchBusiness(session.user.id);
  }, [fetchBusiness, session?.user?.id]);

  useEffect(() => {
    const unsubscribe = subscribeToDeepLinks({
      onRecovery: () => {
        router.push('/(auth)/reset-password');
      },
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user?.id) {
        fetchBusiness(currentSession.user.id).then(async (biz) => {
          if (currentSession.user) {
            await ensureCafeLinked(currentSession.user, biz ?? null);
          }
        }).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        setBusinessLoading(true);
        fetchBusiness(nextSession.user.id)
          .then((biz) => {
            if (nextSession.user) {
              return ensureCafeLinked(nextSession.user, biz);
            }
          })
          .finally(() => setBusinessLoading(false));
      } else {
        setBusiness(null);
        setBusinessLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [fetchBusiness, ensureCafeLinked]);

  const signIn = useCallback(async (email: string, password: string) => {
    await clearStaffSession();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      return { error: error.message };
    }

    if (data.user?.id) {
      setBusinessLoading(true);
      try {
        const biz = await fetchBusiness(data.user.id);
        if (data.user) {
          await ensureCafeLinked(data.user, biz);
        }
      } finally {
        setBusinessLoading(false);
      }
    }

    return { error: null };
  }, [ensureCafeLinked, fetchBusiness]);

  const signUp = useCallback(async (email: string, password: string, businessName: string) => {
    await clearStaffSession();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = businessName.trim() || 'My Business';

    const signup = await ownerSignup({
      email: normalizedEmail,
      password,
      business_name: trimmedName,
    });
    if (signup.error) {
      return { error: signup.error };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      return { error: error.message };
    }

    if (data.user?.id) {
      setBusinessLoading(true);
      try {
        await fetchBusiness(data.user.id);
      } finally {
        setBusinessLoading(false);
      }
    }

    return { error: null };
  }, [fetchBusiness]);

  const signInDev = useCallback(async (email: string, password: string, bootstrapSecret: string) => {
    await clearStaffSession();

    const normalizedEmail = email.trim().toLowerCase();
    const bootstrap = await bootstrapDevAccount(normalizedEmail, password, bootstrapSecret);
    if (bootstrap.error) {
      return { error: bootstrap.error };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      return { error: error.message };
    }

    if (data.user?.id) {
      const biz = await fetchBusiness(data.user.id);
      if (data.user) {
        await ensureCafeLinked(data.user, biz);
      }
    }

    return { error: null };
  }, [ensureCafeLinked, fetchBusiness]);

  const signOut = useCallback(async () => {
    await clearStaffSession();
    await supabase.auth.signOut();
    setBusiness(null);
    setBusinessLoading(false);
    router.replace('/(auth)/gate');
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      business,
      isLoading,
      businessLoading,
      signIn,
      signUp,
      signInDev,
      signOut,
      refreshBusiness,
    }),
    [session, business, isLoading, businessLoading, signIn, signUp, signInDev, signOut, refreshBusiness],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
