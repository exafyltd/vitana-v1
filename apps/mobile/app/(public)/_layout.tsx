/** VTID-05186 (N3, plan change 14) — public auth routes: no shell chrome (web bottom-nav hide list). */
import { Stack } from 'expo-router';

export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
