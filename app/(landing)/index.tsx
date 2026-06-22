import { Redirect } from 'expo-router';

export default function LandingIndex() {
  return <Redirect href="/(auth)/gate" />;
}
