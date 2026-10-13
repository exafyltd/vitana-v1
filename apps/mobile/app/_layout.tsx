/**
 * VTID-05157 — Expo Router root layout. VTID-05186 (N3, plan change 14):
 * SafeArea → React Query → Theme → Auth → Tenant → Language/I18n → Guided mode
 * → shell root (UI kit, direction, overlays) → Stack.
 */
import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { AuthProvider } from '../src/auth/AuthProvider';
import { TenantProvider } from '../src/identity/TenantProvider';
import { LanguageProvider } from '../src/identity/LanguageProvider';
import { GuidedModeProvider } from '../src/identity/GuidedModeProvider';
import { ShellRoot } from '../src/shell/ShellRoot';

// Arabic is right-to-left; layouts use start/end, never left/right.
I18nManager.allowRTL(true);

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <TenantProvider>
                <LanguageProvider>
                  <GuidedModeProvider>
                    <ShellRoot>
                      <Stack screenOptions={{ headerShown: false }} />
                    </ShellRoot>
                  </GuidedModeProvider>
                </LanguageProvider>
              </TenantProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
