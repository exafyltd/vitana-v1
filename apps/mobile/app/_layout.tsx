/**
 * VTID-05157 — Expo Router root layout (Native app Wave 0). Mirrors no web
 * screen yet: a Stack inside the safe-area and i18n providers.
 *
 * VTID-05178 (N4-APP) — mounts the remote-config refresh (launch + foreground),
 * link routing (push opens and system links through the one resolver) and the
 * push lifecycle (token refresh, badge). Without a G1 gateway URL and with the
 * Noop push provider none of them makes a network call.
 */
import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { useRemoteConfigRefresh } from '../src/config/remote-config';
import { useLinkRouting } from '../src/linking/link-router';
import { usePushLifecycle } from '../src/push/registration';

// Arabic is right-to-left; layouts use start/end, never left/right.
I18nManager.allowRTL(true);

export default function RootLayout() {
  useRemoteConfigRefresh();
  useLinkRouting();
  usePushLifecycle();
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
