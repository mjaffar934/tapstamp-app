import { Redirect } from 'expo-router';

/** Legacy route — in-person onboarding starts at welcome */
export default function WaitingScreen() {
  return <Redirect href="/(onboarding)/welcome" />;
}
