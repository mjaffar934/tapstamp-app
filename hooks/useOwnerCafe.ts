import { useAuth } from '@/contexts/AuthContext';
import { useCafeSettings } from '@/hooks/useCafeSettings';

/** Resolves the owner's cafe using auth user id, then sign-in email. */
export function useOwnerCafe() {
  const { user, business } = useAuth();
  const email = user?.email?.toLowerCase() ?? business?.email?.toLowerCase();
  return useCafeSettings({ userId: user?.id, userEmail: email });
}
