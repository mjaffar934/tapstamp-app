import * as Linking from 'expo-linking';

/** Deep link Supabase should redirect to after a password-reset email tap. */
export function passwordResetRedirectUrl(): string {
  return Linking.createURL('reset-password');
}
