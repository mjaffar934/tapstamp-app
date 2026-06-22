import { Redirect } from 'expo-router';
import { Linking } from 'react-native';
import { useEffect } from 'react';
import { ORDER_SIGNUP_URL } from '@/constants/config';

export default function OrderScreen() {
  useEffect(() => {
    Linking.openURL(ORDER_SIGNUP_URL);
  }, []);

  return <Redirect href="/(auth)/gate" />;
}
