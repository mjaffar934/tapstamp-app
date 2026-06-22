import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearStaffSession, getStaffSession, setStaffSession, type StaffSession } from '@/lib/staffSession';
import { authenticateStaff } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface StaffContextValue {
  staffSession: StaffSession | null;
  isLoading: boolean;
  signInWithCode: (code: string) => Promise<{ error: string | null }>;
  signOutStaff: () => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staffSession, setStaffSessionState] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStaff = useCallback(async () => {
    const session = await getStaffSession();
    setStaffSessionState(session);
  }, []);

  useEffect(() => {
    refreshStaff().finally(() => setIsLoading(false));
  }, [refreshStaff]);

  const signInWithCode = useCallback(async (code: string) => {
    await supabase.auth.signOut();
    const result = await authenticateStaff(code);
    if (result.error || !result.cafeId) {
      return { error: result.error ?? 'Invalid staff code' };
    }

    const session = {
      cafeId: result.cafeId,
      cafeName: result.cafeName ?? 'Your cafe',
      staffCode: code.trim().toUpperCase(),
    };
    await setStaffSession(session);
    setStaffSessionState(session);
    return { error: null };
  }, []);

  const signOutStaff = useCallback(async () => {
    await clearStaffSession();
    setStaffSessionState(null);
  }, []);

  const value = useMemo(
    () => ({ staffSession, isLoading, signInWithCode, signOutStaff, refreshStaff }),
    [staffSession, isLoading, signInWithCode, signOutStaff, refreshStaff],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within StaffProvider');
  }
  return context;
}
