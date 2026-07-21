import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registers for remote push and stores the Expo token on the owner's business. */
export async function registerOwnerPushToken(ownerId: string): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('billing', {
        name: 'Billing',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId =
      Constants.easConfig?.projectId
      ?? (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResult.data;
    if (!token) return null;

    await supabase
      .from('businesses')
      .update({ expo_push_token: token })
      .eq('owner_id', ownerId);

    return token;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return null;
  }
}
