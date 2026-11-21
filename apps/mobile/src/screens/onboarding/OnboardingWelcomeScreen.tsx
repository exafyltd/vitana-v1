/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) — the
 * AuthGuard `/onboarding/welcome` screen, twin of the mobile-web branch of
 * src/pages/onboarding/OnboardingWelcome.tsx (App.tsx:837). The post-sign-in
 * target of every portal (`postSignInTarget` → `/onboarding/welcome[?redirectTo=]`,
 * src/auth/sign-in.ts) lands here with the session `AuthProvider` holds.
 *
 *   speech → form → start
 *
 * - "Welcome to Maxina" + Vitana's speech bubbles (OnboardingSpeech), then the
 *   name / handle form (OnboardingNameForm); after the form a deep link
 *   (`redirectTo`) wins, else the "Your audiobook is ready" card: "Play
 *   Episode 1" (→ `/autopilot?audiobook=play`, the web's fallback route when
 *   no player is mounted — native has none yet) or "Later" (→ the target).
 * - A member who already finished (device flag, or a profile with name and
 *   handle) goes straight to `redirectTo` or `/home`; the skeleton shows while
 *   that is checked.
 * - The web page is outside AppLayout (no top bar, bottom bar or ORB FAB — it
 *   hides the FAB itself). The `(app)` group wraps every screen in the
 *   member shell, so the page is presented full screen over it.
 * - The web's daily intro video needs a native video player the app does not
 *   ship yet; the gradient scrim is drawn over the page background without it
 *   (verification.md "Deviations", as the auth-portals backdrop).
 *
 * Signed-out visitors never reach this screen: the `(app)` AuthGate sends
 * them to `/maxina?redirectTo=`.
 */
import { useContext, useEffect, useState, type ReactElement } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { PressableRow, Skeleton, Text, useUITheme } from '../../ports/ui';
import { OnboardingIcon, useOnboardingPalette, withAlpha } from '../../ports/onboarding';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { AUDIOBOOK_START_ROUTE, DEFAULT_TARGET, safeRedirect, useOnboardingStatus } from './onboarding-data';
import { OnboardingSpeech } from './OnboardingSpeech';
import { OnboardingNameForm } from './OnboardingNameForm';

export type Phase = 'speech' | 'form' | 'start';

function Backdrop(): ReactElement {
  const { colors } = useUITheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} testID="onboarding-backdrop">
      <View style={[styles.scrimTop, { backgroundColor: withAlpha(colors.background, 0.4) }]} />
      <View style={[styles.scrimBottom, { backgroundColor: withAlpha(colors.background, 0.5) }]} />
    </View>
  );
}

/** The web's `ArchetypeSkeleton archetype="form"` while the status is checked. */
function FormSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <View style={styles.center} testID="onboarding-loading">
      <View style={styles.skeleton} accessible accessibilityLabel={t('common.loading')} accessibilityRole="progressbar">
        <Skeleton style={styles.skelTitle} />
        <Skeleton style={styles.skelLine} />
        <Skeleton style={styles.skelField} />
        <Skeleton style={styles.skelField} />
        <Skeleton style={styles.skelButton} />
      </View>
    </View>
  );
}

function AudiobookStart({ onPlay, onLater }: { onPlay: () => void; onLater: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { ruby } = useOnboardingPalette();
  const play = t('screens.onboarding.playEpisodeOne');
  const later = t('screens.onboarding.audiobookLater');
  return (
    <View style={[styles.startCard, { backgroundColor: withAlpha(colors.card, 0.9) }]} testID="onboarding-audiobook-start">
      <View style={[styles.startIcon, { backgroundColor: ruby }]}>
        <OnboardingIcon name="Headphones" size={32} color={colors.primaryForeground} />
      </View>
      <Text variant="title" accessibilityRole="header" style={styles.textCenter}>
        {t('screens.onboarding.audiobookReadyTitle')}
      </Text>
      <Text muted style={styles.textCenter}>
        {t('screens.onboarding.audiobookReadyBody')}
      </Text>
      <PressableRow testID="onboarding-play-episode-one" accessibilityLabel={play} onPress={onPlay} style={[styles.play, { backgroundColor: colors.primary }]}>
        <OnboardingIcon name="Play" size={20} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 16 }}>{play}</Text>
      </PressableRow>
      <PressableRow testID="onboarding-audiobook-later" accessibilityLabel={later} onPress={onLater} style={styles.later}>
        <Text muted>{later}</Text>
      </PressableRow>
    </View>
  );
}

export function OnboardingWelcomeScreen(): ReactElement {
  const { t } = useI18n();
  // The root SafeAreaProvider's insets (the Modal covers the whole window); none mounted → 0.
  const insets = useContext(SafeAreaInsetsContext);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const redirectTo = safeRedirect(params.redirectTo);
  const target = redirectTo ?? DEFAULT_TARGET;
  const { needsOnboarding, loading } = useOnboardingStatus();
  const [phase, setPhase] = useState<Phase>('speech');

  // Already onboarded → straight on (not while the final "play Episode 1" step this page just showed).
  useEffect(() => {
    if (phase === 'start') return;
    if (!loading && !needsOnboarding && user) navigateToWebPath(target, { replace: true });
  }, [phase, loading, needsOnboarding, user, target]);

  const onFormComplete = () => {
    if (redirectTo) {
      navigateToWebPath(redirectTo, { replace: true });
      return;
    }
    setPhase('start');
  };

  const checking = phase !== 'start' && (loading || !needsOnboarding);

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.root} testID="onboarding-welcome">
        <Backdrop />
        <View style={[styles.content, { paddingTop: insets?.top ?? 0, paddingBottom: insets?.bottom ?? 0 }]}>
          {checking ? (
            <FormSkeleton />
          ) : phase === 'speech' ? (
            <View style={styles.speech}>
              <View style={styles.header}>
                <Text variant="title" accessibilityRole="header" style={styles.headline}>
                  {t('screens.onboarding.welcomeMaxina')}
                </Text>
                <Text muted style={styles.subline}>
                  {t('screens.onboarding.yourLongevityJourneyBeginsNow')}
                </Text>
              </View>
              <OnboardingSpeech onComplete={() => setPhase('form')} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
              {phase === 'form' ? (
                <OnboardingNameForm onComplete={onFormComplete} />
              ) : (
                <AudiobookStart onPlay={() => navigateToWebPath(AUDIOBOOK_START_ROUTE, { replace: true })} onLater={() => navigateToWebPath(target, { replace: true })} />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  scrimTop: { position: 'absolute', top: 0, start: 0, end: 0, height: '50%' },
  scrimBottom: { position: 'absolute', bottom: 0, start: 0, end: 0, height: '50%' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48 },
  skeleton: { width: '100%', maxWidth: 384, gap: 12 },
  skelTitle: { height: 28, width: '60%' },
  skelLine: { height: 16, width: '80%' },
  skelField: { height: 40, width: '100%' },
  skelButton: { height: 44, width: '100%', marginTop: 8 },
  speech: { flex: 1, paddingTop: 48, paddingBottom: 16 },
  header: { paddingHorizontal: 24, marginBottom: 16 },
  headline: { fontSize: 24, fontWeight: '700' },
  subline: { fontSize: 14, marginTop: 4 },
  startCard: { width: '100%', maxWidth: 384, borderRadius: 24, padding: 24, alignItems: 'center', gap: 8 },
  startIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  textCenter: { textAlign: 'center' },
  play: { marginTop: 16, minHeight: 48, width: '100%', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  later: { minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center' },
});
