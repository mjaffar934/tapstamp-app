import { useAuth } from '@/contexts/AuthContext';
import { useCafeSettings } from '@/hooks/useCafeSettings';

/** Resolves the owner's cafe using sign-in email, with business email as fallback. */
export function useOwnerCafe() {
  const { user, business } = useAuth();
  const email = user?.email?.toLowerCase() ?? business?.email?.toLowerCase();
  return useCafeSettings(email);
}
