/**
 * VTID-05186 (N3, plan change 13) — the shell root: UI kit provider with the
 * member's colour scheme and direction, and a root view whose `direction`
 * follows the language at once (no remount, no restart). A missing config
 * renders ConfigMissing (plan change 15) instead of the app.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { UIProvider } from '../ports/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useThemeMode } from '../theme/ThemeProvider';
import { shellColors } from '../ports/tokens';
import { useAuth } from '../auth/AuthProvider';
import { ConfigMissing } from '../screens/ConfigMissing';
import { OverlayHost } from './OverlayHost';

export function ShellRoot({ children }: { children: ReactNode }) {
  const { rtl, t } = useI18n();
  const { scheme } = useThemeMode();
  const { configMissing } = useAuth();
  const direction = rtl ? 'rtl' : 'ltr';
  return (
    <UIProvider colorScheme={scheme} direction={direction} t={t}>
      <View testID="shell-root" style={[styles.root, { direction, backgroundColor: shellColors(scheme).background }]}>
        {configMissing ? <ConfigMissing keys={configMissing} /> : children}
        <OverlayHost />
      </View>
    </UIProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
