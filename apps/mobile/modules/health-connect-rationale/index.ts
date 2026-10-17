/**
 * VTID-05184 — Health Connect rationale hand-off (N5a plan change 11).
 *
 * The Health Connect permission screen links to the app's privacy policy by
 * launching the main activity with ACTION_SHOW_PERMISSIONS_RATIONALE (Android
 * ≤ 13) or VIEW_PERMISSION_USAGE (Android 14+, the library plugin's activity
 * alias). The local Kotlin module reports the launch action; this hands
 * `/privacy` to Expo Router. The native `/privacy` screen comes from the
 * Public/legal lane; until then the route resolves to not-found (acceptable for
 * dev and G1 builds, a Wave 3 blocker for store review).
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { router } from 'expo-router';

export const RATIONALE_ACTIONS = ['androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE', 'android.intent.action.VIEW_PERMISSION_USAGE'] as const;
export const PRIVACY_ROUTE = '/privacy';

export function rationaleTarget(action: string | null | undefined): typeof PRIVACY_ROUTE | null {
  return action && (RATIONALE_ACTIONS as readonly string[]).includes(action) ? PRIVACY_ROUTE : null;
}

interface RationaleModule {
  getLaunchAction(): string | null;
}

export function getLaunchRationaleTarget(): typeof PRIVACY_ROUTE | null {
  if (Platform.OS !== 'android') return null;
  const mod = requireOptionalNativeModule<RationaleModule>('HealthConnectRationale');
  return rationaleTarget(mod?.getLaunchAction() ?? null);
}

/** Root layout: on a rationale launch, open the privacy policy once. */
export function useHealthConnectRationaleRedirect(): void {
  useEffect(() => {
    const target = getLaunchRationaleTarget();
    if (!target) return;
    const t = setTimeout(() => router.push(target as never), 0);
    return () => clearTimeout(t);
  }, []);
}
