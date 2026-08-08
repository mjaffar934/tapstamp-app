import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link alias: tapstamp://sign-in?email=… (site success / cancel). */
export default function SignInDeepLink() {
  const params = useLocalSearchParams<{
    email?: string;
    canceled?: string;
    plan?: string;
    reason?: string;
  }>();

  const qs = new URLSearchParams();
  if (typeof params.email === 'string' && params.email.includes('@')) {
    qs.set('email', params.email.trim().toLowerCase());
  }
  if (params.canceled === '1') qs.set('canceled', '1');
  if (typeof params.plan === 'string' && params.plan) qs.set('plan', params.plan);
  if (typeof params.reason === 'string' && params.reason) qs.set('reason', params.reason);

  const query = qs.toString();
  return <Redirect href={query ? `/(auth)/gate?${query}` : '/(auth)/gate'} />;
}
