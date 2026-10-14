/**
 * VTID-05182 — the full-screen ORB overlay (native N6d, plan Changes 15–16).
 *
 * Mirrors the widget overlay (`.vtorb-overlay`, orb-widget.js:593-599): a dark
 * full-screen layer, the sphere with the state aura (`_AURA`, :5025-5033), a
 * status caption, and mic + close buttons. Every visible string is an i18n
 * key (orb-ui-state.ts); nothing here is spoken. Transcripts are not shown —
 * the widget shows none — and reach screen readers only through a polite
 * live region. Layout uses start/end only, and the modal carries the
 * language's direction itself (a Modal renders outside the shell root).
 *
 * Permission flow (Change 16): `rationale` explains why the microphone is
 * needed before the OS prompt; `denied` offers the OS settings. No session
 * starts without the microphone.
 */
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { useOrbSession } from './OrbProvider';
import { auraFor, CAPTION_KEYS, OVERLAY_BACKGROUND, SPHERE_GRADIENT, sphereDimmed, type OrbPhase } from './orb-ui-state';

const SPHERE = 200;
const FOREGROUND = 'rgba(226,232,240,0.95)';
const MUTED_FOREGROUND = 'rgba(226,232,240,0.7)';

function Glyph({ kind, color }: { kind: 'close' | 'mic' | 'micOff' | 'restart'; color: string }) {
  if (kind === 'close') {
    return (
      <View style={styles.glyph}>
        <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
      </View>
    );
  }
  if (kind === 'restart') {
    return (
      <View style={styles.glyph}>
        <View style={[styles.ring, { borderColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.glyph}>
      <View style={[styles.micBody, { borderColor: color }]} />
      <View style={[styles.micStand, { backgroundColor: color }]} />
      {kind === 'micOff' ? <View style={[styles.bar, styles.slash, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function RoundButton({ testID, label, onPress, tone, children }: { testID: string; label: string; onPress: () => void; tone: 'mic' | 'muted' | 'plain'; children: ReactNode }) {
  const background = tone === 'muted' ? 'rgba(239,68,68,0.2)' : tone === 'mic' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)';
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.round, { backgroundColor: background, opacity: pressed ? 0.7 : 1 }]}>
      {children}
    </Pressable>
  );
}

function TextButton({ testID, label, onPress, primary }: { testID: string; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButton, primary ? styles.primary : null, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.textButtonLabel, { color: primary ? '#0a0c14' : FOREGROUND }]}>{label}</Text>
    </Pressable>
  );
}

function Sphere({ phase }: { phase: OrbPhase }) {
  const aura = auraFor(phase);
  return (
    <View testID="orb-sphere" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.sphereWrap}>
      {aura.outer ? <View style={[styles.aura, styles.auraOuter, { experimental_backgroundImage: `radial-gradient(circle, ${aura.outer} 0%, transparent 70%)`, opacity: aura.outerOpacity }]} /> : null}
      <View style={[styles.aura, { experimental_backgroundImage: `radial-gradient(circle, ${aura.inner} 0%, transparent 70%)`, opacity: aura.innerOpacity }]} />
      <View style={[styles.sphere, sphereDimmed(phase) ? styles.dimmed : null]} />
    </View>
  );
}

export function OrbOverlay() {
  const { t, rtl } = useI18n();
  const { controller, state } = useOrbSession();

  // iOS has no live regions: announce what Vitana said for VoiceOver users.
  useEffect(() => {
    if (state.open && state.liveText) AccessibilityInfo.announceForAccessibility(state.liveText);
  }, [state.open, state.liveText]);

  if (!controller) return null;
  const phase: OrbPhase = state.phase ?? 'connecting';
  const active = phase === 'connecting' || phase === 'listening' || phase === 'thinking' || phase === 'speaking' || phase === 'muted' || phase === 'reconnecting';

  return (
    <Modal visible={state.open} transparent animationType="fade" onRequestClose={() => controller.close()} statusBarTranslucent>
      <View testID="orb-overlay" accessibilityViewIsModal style={[styles.root, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <View style={styles.topRow}>
          <RoundButton testID="orb-close" label={t('orbNative.a11y.close')} onPress={() => controller.close()} tone="plain">
            <Glyph kind="close" color={FOREGROUND} />
          </RoundButton>
        </View>

        <View style={styles.center}>
          <Sphere phase={phase} />
          {phase === 'rationale' ? (
            <View testID="orb-rationale" style={styles.panel}>
              <Text accessibilityRole="header" style={styles.title}>
                {t('orbNative.rationale.title')}
              </Text>
              <Text style={styles.body}>{t('orbNative.rationale.body')}</Text>
              <View style={styles.actions}>
                <TextButton testID="orb-rationale-continue" label={t('orbNative.rationale.continue')} onPress={() => void controller.continueRationale()} primary />
                <TextButton testID="orb-rationale-not-now" label={t('orbNative.rationale.notNow')} onPress={() => controller.close()} />
              </View>
            </View>
          ) : (
            <Text testID="orb-caption" accessibilityLiveRegion="polite" style={styles.caption}>
              {t(CAPTION_KEYS[phase])}
            </Text>
          )}
          {phase === 'denied' ? (
            <View testID="orb-denied" style={styles.panel}>
              <Text style={styles.body}>{t('orbNative.denied.body')}</Text>
              <View style={styles.actions}>
                <TextButton testID="orb-open-settings" label={t('orbNative.denied.openSettings')} onPress={() => controller.openSettings()} primary />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          {active ? (
            <RoundButton
              testID="orb-mic"
              label={t(state.muted ? 'orbNative.a11y.micUnmute' : 'orbNative.a11y.micMute')}
              onPress={() => controller.toggleMute()}
              tone={state.muted ? 'muted' : 'mic'}
            >
              <Glyph kind={state.muted ? 'micOff' : 'mic'} color={state.muted ? '#fca5a5' : '#93c5fd'} />
            </RoundButton>
          ) : phase === 'ended' || phase === 'error' ? (
            <RoundButton testID="orb-restart" label={t('orbNative.a11y.restart')} onPress={() => void controller.restart()} tone="mic">
              <Glyph kind="restart" color="#93c5fd" />
            </RoundButton>
          ) : null}
        </View>

        {/* What Vitana says, for screen readers only (the widget shows no transcript). */}
        <Text testID="orb-live-region" accessibilityLiveRegion="polite" style={styles.srOnly}>
          {state.liveText ?? ''}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: OVERLAY_BACKGROUND, paddingTop: 56, paddingBottom: 48, paddingHorizontal: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', minHeight: 56 },
  sphereWrap: { width: SPHERE * 1.4, height: SPHERE * 1.4, alignItems: 'center', justifyContent: 'center' },
  aura: { position: 'absolute', width: SPHERE * 1.3, height: SPHERE * 1.3, borderRadius: SPHERE },
  auraOuter: { width: SPHERE * 1.4, height: SPHERE * 1.4 },
  sphere: {
    width: SPHERE,
    height: SPHERE,
    borderRadius: SPHERE / 2,
    backgroundColor: '#5a6a8a',
    experimental_backgroundImage: SPHERE_GRADIENT,
    boxShadow: '0 0 60px rgba(90,110,150,0.3)',
  },
  dimmed: { opacity: 0.6 },
  caption: { color: FOREGROUND, fontSize: 16, textAlign: 'center' },
  panel: { alignItems: 'stretch', gap: 12, maxWidth: 360, width: '100%' },
  title: { color: FOREGROUND, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { color: MUTED_FOREGROUND, fontSize: 15, textAlign: 'center' },
  actions: { gap: 8 },
  textButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  primary: { backgroundColor: 'rgba(226,232,240,0.95)' },
  textButtonLabel: { fontSize: 15, fontWeight: '600' },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  glyph: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: 22, height: 2, borderRadius: 1 },
  slash: { transform: [{ rotate: '45deg' }] },
  ring: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  micBody: { width: 10, height: 15, borderRadius: 5, borderWidth: 2 },
  micStand: { width: 2, height: 5 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', color: 'transparent' },
});
