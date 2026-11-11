/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * mobile-web chrome of the Maxina portal (src/pages/portals/MaxinaPortal.tsx
 * :505-878) around the functional N3 sign-in / sign-up card:
 *
 * - `PortalBackdrop` — the two gradient overlay layers over the page
 *   background (`bg-background/50 → /30 → /50`, `from-background/40`). The
 *   web's daily intro video (`getIntroVideoSrc('maxina')`, a web-host
 *   `/videos/intro/…` file) needs a native video player the app does not ship
 *   yet; the backdrop is drawn without it (verification.md "Deviations").
 * - `PortalFooter` — "Maxina is part of the VITANA ecosystem." and
 *   Privacy · Terms · Help (`/privacy`, `/terms`, `mailto:support@exafy.io`).
 * - `OrbDiscoveryHint` — the "Tap here to talk to Vitana" pill
 *   (src/components/vitanaland/OrbDiscoveryHint.tsx): enter → hold → exit →
 *   gap cycle (450 / 2400 / 700 / 5000 ms), tap opens the ORB and dismisses
 *   it for the visit. Shown only when the ORB controller exists (the web shows
 *   it only while the Orb FAB is present); a static pill under reduce motion.
 * - `DiagBadge` — `?diag=1` only (src/components/auth/WebViewDiagBadge.tsx):
 *   the native runtime facts (platform, OS version, app version) instead of
 *   the WebView's UA / Appilix bridge / bundle hash.
 * - `useConfirmedToast` — `?confirmed=true` → the "Email confirmed!" toast once.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { notifySuccess, useAuthPalette, useReducedMotion } from '../../ports/auth';
import { useI18n } from '../../i18n/I18nProvider';
import { useOrbSession } from '../../orb/ui/OrbProvider';

export const SUPPORT_MAILTO = 'mailto:support@exafy.io';

export function PortalBackdrop() {
  const { colors } = useUITheme();
  const { overlay } = useAuthPalette();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} testID="portal-backdrop">
      <View style={[styles.layerTop, { backgroundColor: overlay }]} />
      <View style={[styles.layerBottom, { backgroundColor: overlay }]} />
    </View>
  );
}

export function PortalFooter() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const link = (testID: string, label: string, onPress: () => void) => (
    <PressableRow testID={testID} accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={styles.footerLink}>
      <Text variant="caption" style={{ color: colors.foreground, fontWeight: '500' }}>
        {label}
      </Text>
    </PressableRow>
  );
  return (
    <View style={styles.footer} testID="portal-footer">
      <Text variant="caption" muted style={styles.center}>
        {t('portals.maxina.partOfVitana')}
      </Text>
      <View style={styles.footerRow}>
        {link('portal-privacy', t('screens.portals.privacy'), () => router.navigate('/privacy' as never))}
        <Text variant="caption" muted accessibilityElementsHidden importantForAccessibility="no">
          ·
        </Text>
        {link('portal-terms', t('screens.portals.terms'), () => router.navigate('/terms' as never))}
        <Text variant="caption" muted accessibilityElementsHidden importantForAccessibility="no">
          ·
        </Text>
        {link('portal-help', t('screens.portals.help'), () => void Linking.openURL(SUPPORT_MAILTO).catch(() => undefined))}
      </View>
    </View>
  );
}

type Phase = 'enter' | 'hold' | 'exit' | 'gap';
export const ORB_HINT_PHASE_MS: Record<Phase, number> = { enter: 450, hold: 2400, exit: 700, gap: 5000 };
const NEXT_PHASE: Record<Phase, Phase> = { enter: 'hold', hold: 'exit', exit: 'gap', gap: 'enter' };

export function OrbDiscoveryHint() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const reducedMotion = useReducedMotion();
  const { controller, state } = useOrbSession();
  const [phase, setPhase] = useState<Phase>('enter');
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const available = !!controller && !state.open && !dismissed;

  useEffect(() => {
    if (!available) return undefined;
    const timer = setTimeout(() => setPhase((p) => NEXT_PHASE[p]), ORB_HINT_PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase, available]);

  useEffect(() => {
    const to = phase === 'enter' || phase === 'hold' ? 1 : 0;
    const anim = Animated.timing(opacity, { toValue: to, duration: reducedMotion ? 200 : phase === 'exit' ? 700 : 450, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [phase, opacity, reducedMotion]);

  if (!available || phase === 'gap') return null;

  return (
    <Animated.View style={[styles.hint, { opacity }]} pointerEvents="box-none">
      <PressableRow
        testID="orb-hint"
        accessibilityRole="button"
        accessibilityLabel={t('orbHint.tapToTalk')}
        disabled={phase === 'exit'}
        onPress={() => {
          setDismissed(true);
          void controller?.open();
        }}
        style={[styles.hintPill, { backgroundColor: colors.primary }]}
      >
        <Text style={{ color: colors.primaryForeground, fontWeight: '500' }}>{t('orbHint.tapToTalk')}</Text>
      </PressableRow>
    </Animated.View>
  );
}

export function DiagBadge({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const { warning } = useAuthPalette();
  if (!enabled) return null;
  const rows: Array<[string, string]> = [
    [t('screens.auth.bundle'), String(Constants.expoConfig?.version ?? '?')],
    [t('screens.auth.platform'), `${Platform.OS} ${String(Platform.Version)}`],
  ];
  return (
    <View style={[styles.diag, { backgroundColor: warning }]} testID="portal-diag">
      {rows.map(([label, value]) => (
        <Text key={label} variant="caption">
          {label} {value}
        </Text>
      ))}
    </View>
  );
}

/** `?confirmed=true` → MaxinaPortal.tsx's "Email confirmed! Welcome to Maxina." toast, once per mount. */
export function useConfirmedToast(confirmed: boolean, key = 'portals.maxina.emailConfirmed'): void {
  const shown = useRef(false);
  useEffect(() => {
    if (!confirmed || shown.current) return;
    shown.current = true;
    notifySuccess(key);
  }, [confirmed, key]);
}

const styles = StyleSheet.create({
  layerTop: { position: 'absolute', top: 0, start: 0, end: 0, height: '50%' },
  layerBottom: { position: 'absolute', bottom: 0, start: 0, end: 0, height: '40%' },
  footer: { gap: 8, marginTop: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  footerLink: { minHeight: 44, justifyContent: 'center' },
  center: { textAlign: 'center' },
  hint: { position: 'absolute', bottom: 32, start: 0, end: 0, alignItems: 'center' },
  hintPill: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  diag: { position: 'absolute', top: 0, start: 0, end: 0, paddingHorizontal: 12, paddingVertical: 8, zIndex: 10 },
});
