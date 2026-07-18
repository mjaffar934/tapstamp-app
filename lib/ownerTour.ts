import * as SecureStore from 'expo-secure-store';

const KEY = 'tapstamp_owner_tour_v1';

export async function shouldShowOwnerTour(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) !== 'done';
}

export async function completeOwnerTour(): Promise<void> {
  await SecureStore.setItemAsync(KEY, 'done');
}
