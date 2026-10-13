/**
 * VTID-05186 (N3, plan change 14) — the signed-in area: AuthGate around a Stack.
 * Bottom-bar taps call router.navigate (no tab navigator state: the web
 * remounts the page on every tab tap, MobileBottomNav.tsx).
 */
import { Stack } from 'expo-router';
import { AuthGate } from '../../src/shell/AuthGate';

export default function AppLayout() {
  return (
    <AuthGate guest={(content) => content}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGate>
  );
}
