import { router, type Href } from 'expo-router';

/** Pop nested settings screens back to the Settings hub (native stack feel). */
export function backToSettings() {
  const href = '/(app)/(tabs)/settings' as Href;
  try {
    if (typeof router.dismissTo === 'function') {
      router.dismissTo(href);
      return;
    }
  } catch {
    // fall through
  }
  router.replace(href);
}

/** Reset Settings stack to its root, then land on Home (used after tour). */
export function resetAppTabsToHome() {
  try {
    if (typeof router.dismissTo === 'function') {
      router.dismissTo('/(app)/(tabs)/settings' as Href);
    }
  } catch {
    // ignore
  }
  router.replace('/(app)/(tabs)/home');
}
