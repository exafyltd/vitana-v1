/**
 * VTID-05157 — Expo Router root layout (Native app Wave 0). Mirrors no web
 * screen yet: a Stack inside the safe-area and i18n providers.
 */
import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../src/i18n/I18nProvider';

// Arabic is right-to-left; layouts use start/end, never left/right.
I18nManager.allowRTL(true);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
