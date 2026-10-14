/**
 * VTID-05176 — VitanaUIProvider (plan change 7).
 *
 * Only the OUTERMOST provider renders the GestureHandlerRootView, the overlay
 * root and the toast host (UIRootContext marks it). A nested provider — e.g.
 * the dev catalogue inside N3's root provider — renders none of them and only
 * overrides the theme values it is given, so exactly one theme context is in
 * effect at any point and there is one host per app.
 */
import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, I18nManager, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ColorScheme, TenantId } from '../theme';
import { buildTheme, ThemeContext, UIRootContext, type Direction } from './context';
import { ToastSlot } from '../toast/ToastHost';

export type VitanaUIProviderProps = {
  /** Default `'light'` at the root (web `defaultTheme="light"`); a nested provider inherits. */
  colorScheme?: ColorScheme | 'system';
  tenant?: TenantId;
  /** Defaults to `I18nManager.isRTL` at the root; a nested provider inherits. */
  direction?: Direction;
  /** Overrides the OS reduce-motion setting (tests and the catalogue). */
  reducedMotion?: boolean;
  children?: ReactNode;
};

function useOsReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (alive && v) setReduced(true);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduced(v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

export function VitanaUIProvider({ colorScheme, tenant, direction, reducedMotion, children }: VitanaUIProviderProps) {
  const isNested = useContext(UIRootContext);
  const parent = useContext(ThemeContext);
  const system = useColorScheme();
  const osReduced = useOsReducedMotion();

  const requested = colorScheme ?? parent?.scheme ?? 'light';
  const scheme: ColorScheme = requested === 'system' ? (system === 'dark' ? 'dark' : 'light') : requested;
  const dir: Direction = direction ?? parent?.direction ?? (I18nManager.isRTL ? 'rtl' : 'ltr');
  const reduced = reducedMotion ?? parent?.reducedMotion ?? osReduced;
  const ten = tenant ?? parent?.tenant;

  const theme = useMemo(() => buildTheme(scheme, dir, reduced, ten), [scheme, dir, reduced, ten]);
  const themed = <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

  if (isNested) return themed;

  return (
    <UIRootContext.Provider value>
      <GestureHandlerRootView style={styles.fill} testID="vitana-ui-gesture-root">
        {themed}
        <ThemeContext.Provider value={theme}>
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="vitana-ui-overlay-root">
            <ToastSlot overlayId={null} />
          </View>
        </ThemeContext.Provider>
      </GestureHandlerRootView>
    </UIRootContext.Provider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
