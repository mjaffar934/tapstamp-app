import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useStaff } from '@/contexts/StaffContext';
import { colors } from '@/constants/theme';

export default function Index() {
  const { session, business, isLoading: authLoading, businessLoading } = useAuth();
  const { staffSession, isLoading: staffLoading } = useStaff();

  if (authLoading || staffLoading || (session && businessLoading)) {
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

  if (!business) {
    return <Redirect href="/(auth)/gate?reason=no_account" />;
  }

  if (business.onboarding_status === 'pending_activation') {
    return <Redirect href="/(onboarding)/activate" />;
  }

  if (business.onboarding_status !== 'complete') {
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
