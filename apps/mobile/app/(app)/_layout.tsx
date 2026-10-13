/**
 * VTID-05186 (N3, plan changes 14 + 17) — the signed-in area: AuthGate +
 * MobileAppShell around a Stack (guests on allowGuest destinations get the
 * public shell). Bottom-bar taps call router.navigate (no tab navigator
 * state: the web remounts the page on every tab tap, MobileBottomNav.tsx).
 */
import { Stack } from 'expo-router';
import { AuthGate } from '../../src/shell/AuthGate';
import { MobileAppShell } from '../../src/shell/components/MobileAppShell';
import { PublicShell } from '../../src/shell/components/PublicShell';

export default function AppLayout() {
  return (
    <AuthGate
      member={
        <MobileAppShell>
          <Stack screenOptions={{ headerShown: false }} />
        </MobileAppShell>
      }
      guest={
        <PublicShell>
          <Stack screenOptions={{ headerShown: false }} />
        </PublicShell>
      }
    />
  );
}
