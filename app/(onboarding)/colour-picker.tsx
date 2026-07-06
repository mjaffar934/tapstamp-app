import { Redirect } from 'expo-router';

/** Colour picking removed — TapStamp uses one brand look for all cafes. */
export default function ColourPickerScreen() {
  return <Redirect href="/(onboarding)/logo-upload" />;
}
