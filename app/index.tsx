import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/contexts/StaffContext';
import { colors } from '@/constants/theme';

export default function Index() {
  const { session, business, isLoading: authLoading } = useAuth();
  const { staffSession, isLoading: staffLoading } = useStaff();

  if (authLoading || staffLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (staffSession) {
    return <Redirect href="/(staff)/barista" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/gate" />;
  }

  if (!business || business.onboarding_status !== 'complete') {
    if (business?.order_status === 'pending_payment') {
      return <Redirect href={'/(onboarding)/payment-pending' as Href} />;
    }
    if (business && !business.kit_received) {
      return <Redirect href={'/(onboarding)/waiting' as Href} />;
    }
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(app)/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
