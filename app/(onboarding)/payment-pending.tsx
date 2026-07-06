import { Redirect } from 'expo-router';

/** Legacy route — payment handled offline before app setup */
export default function PaymentPendingScreen() {
  return <Redirect href="/(onboarding)/welcome" />;
}
