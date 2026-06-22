import { Redirect } from 'expo-router';

/** Sign-in lives on the gate screen */
export default function LoginScreen() {
  return <Redirect href="/(auth)/gate" />;
}
