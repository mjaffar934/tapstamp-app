export const DEV_SIGN_IN_ENABLED = __DEV__;

export const DEV_EMAIL = (process.env.EXPO_PUBLIC_DEV_EMAIL ?? '').trim();
export const DEV_PASSWORD = (process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '').trim();
export const DEV_BOOTSTRAP_SECRET = (process.env.EXPO_PUBLIC_DEV_BOOTSTRAP_SECRET ?? '').trim();

export function hasDevCredentials(): boolean {
  return Boolean(DEV_EMAIL && DEV_PASSWORD);
}

export function hasDevBootstrap(): boolean {
  return Boolean(DEV_BOOTSTRAP_SECRET);
}
