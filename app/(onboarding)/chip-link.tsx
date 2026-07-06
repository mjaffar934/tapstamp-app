import { Redirect } from 'expo-router';

/** Legacy route — chip linking now happens on activate. */
export default function ChipLinkRedirect() {
  return <Redirect href="/(onboarding)/activate" />;
}
