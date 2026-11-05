/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — twin
 * of `src/components/audiobook/AudiobookMiniPlayer.tsx` (VTID-04761), the
 * Audiobook mini player. Mounted once, app-wide, next to the router (web
 * App.tsx:809-810), it floats above the bottom bar (web
 * `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] inset-x-3`) while a queue
 * is loaded. Top to bottom, as the web:
 *
 *   end-of-episode card (✨ "Episode N done", "+2 VITANA INDEX", "Try it now", dismiss)
 *   🎧 badge · "Episode N" · title (or "finished" / "loading") · close
 *   progress bar (role progressbar, width animates)
 *   error line + "Ask Vitana" (unavailable) / "Retry" (network)  — or —
 *   speed · previous · play/pause (spinner while loading) · next · sleep timer
 *   "Ask Vitana"
 *
 * "Try it now" runs the episode's practice target (journeyPractice.ts:95-104):
 * a route through the one navigator, an overlay event on the bus, or the ORB.
 * The previous / play / next glyphs mirror in RTL (web `rtl:-scale-x-100`).
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useUITheme } from '../../ports/ui';
import { AudiobookIcon, toneAlpha, useAudiobookTone, useReducedMotion } from '../../ports/audiobook';
import { practiceTargetAction, useActivateOrb } from '../../ports/journey-dashboard';
import { useI18n } from '../../i18n/I18nProvider';
import { overlayBus } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';
import { useAudiobookPlayer } from './AudiobookPlayerProvider';
import { emitAudiobookEvent } from './events';

/** web `bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]`. */
export const MINI_PLAYER_BOTTOM_OFFSET = 88;

/** A diagonal or horizontal two-stop gradient behind `children` (web `bg-gradient-to-br` / `-to-r`). */
function Gradient({ from, to, diagonal, style, children, id }: { from: string; to: string; diagonal?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode; id: string }) {
  return (
    <View style={[style, styles.clip]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2={diagonal ? '100%' : '0%'}>
            <Stop offset="0%" stopColor={from} />
            <Stop offset="100%" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

/** Tailwind `animate-spin` (one turn a second, linear) on the loader; still under reduced motion. */
function Spinner({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return undefined;
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View testID="audiobook-loading" style={reduce ? undefined : { transform: [{ rotate }] }}>
      <AudiobookIcon name="Loader2" size={24} color={color} />
    </Animated.View>
  );
}

/** The progress fill; `transition-[width]` (150 ms) as the web. */
function ProgressFill({ pct, color }: { pct: number; color: string }) {
  const reduce = useReducedMotion();
  const width = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    if (reduce) {
      width.setValue(pct);
      return undefined;
    }
    const anim = Animated.timing(width, { toValue: pct, duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [pct, reduce, width]);
  return <Animated.View testID="audiobook-progress-fill" style={[styles.fill, { backgroundColor: color, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />;
}

function IconButton({ onPress, label, disabled, children, testID, style }: { onPress: () => void; label: string; disabled?: boolean; children: ReactNode; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function AudiobookMiniPlayer(): ReactElement | null {
  const player = useAudiobookPlayer();
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const tone2 = useAudiobookTone('category-2');
  const tone4 = useAudiobookTone('category-4');
  const insets = useSafeAreaInsets();
  const activateOrb = useActivateOrb();
  if (!player || !player.active) return null;

  const { playing, loading, error, track, position, duration, rate, sleepMinutes, episodeSummary, finished } = player;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const number = (n: number) => new Intl.NumberFormat(locale).format(n);

  const tryItNow = () => {
    if (!episodeSummary) return;
    const action = practiceTargetAction(episodeSummary.practiceTarget);
    emitAudiobookEvent('try_it_now', { episode: episodeSummary.episode, practiceTarget: episodeSummary.practiceTarget });
    player.dismissSummary();
    if (!action || action.kind === 'orb') {
      player.askVitana();
      return;
    }
    if (action.kind === 'overlay') {
      overlayBus.emit(action.event);
      return;
    }
    navigateToWebPath(action.route);
  };

  return (
    <View
      testID="audiobook-mini-player"
      accessibilityRole="summary"
      accessibilityLabel={t('screens.audiobook.playerRegion')}
      style={[styles.region, { bottom: insets.bottom + MINI_PLAYER_BOTTOM_OFFSET, borderColor: toneAlpha(tone2, 0.15), backgroundColor: toneAlpha(colors.card, 0.95) }]}
    >
      {episodeSummary ? (
        <Gradient id="audiobookSummaryGrad" from={toneAlpha(tone2, 0.1)} to={toneAlpha(tone4, 0.1)} style={styles.summary}>
          <View testID="audiobook-episode-summary" accessibilityLiveRegion="polite" style={styles.summaryRow}>
            <AudiobookIcon name="Sparkles" size={20} color={tone2} />
            <View style={styles.flex}>
              <Text size="sm" weight="600">
                {t('screens.audiobook.episodeDone', { n: episodeSummary.episode })}
              </Text>
              <Text size="xs" style={{ color: tone2 }}>
                {t('screens.audiobook.episodeDoneReward')}
              </Text>
              <Pressable onPress={tryItNow} accessibilityRole="button" testID="audiobook-try-it-now" style={[styles.tryIt, { backgroundColor: colors.card }]}>
                <Text size="xs" weight="500" style={{ color: tone2 }}>
                  {t('screens.audiobook.tryItNow')}
                </Text>
              </Pressable>
            </View>
            <IconButton onPress={player.dismissSummary} label={t('screens.audiobook.dismiss')} testID="audiobook-dismiss-summary" style={styles.smallButton}>
              <AudiobookIcon name="X" size={16} color={colors.mutedForeground} />
            </IconButton>
          </View>
        </Gradient>
      ) : null}

      <View style={styles.header}>
        <Gradient id="audiobookBadgeGrad" from={tone4} to={tone2} diagonal style={styles.badge}>
          <View style={styles.badgeIcon}>
            <AudiobookIcon name="Headphones" size={20} color={colors.primaryForeground} />
          </View>
        </Gradient>
        <View style={styles.flex}>
          <Text size="xs" weight="500" style={[styles.eyebrow, { color: tone2 }]}>
            {track ? t('screens.audiobook.episodeN', { n: track.episode }) : t('screens.audiobook.title')}
          </Text>
          <Text size="sm" weight="600" numberOfLines={1} testID="audiobook-track-title">
            {finished ? t('screens.audiobook.finished') : (track?.title ?? t('screens.audiobook.loading'))}
          </Text>
        </View>
        <IconButton onPress={player.close} label={t('screens.audiobook.close')} testID="audiobook-close">
          <AudiobookIcon name="X" size={20} color={colors.mutedForeground} />
        </IconButton>
      </View>

      <View
        testID="audiobook-progress"
        accessibilityRole="progressbar"
        accessibilityLabel={t('screens.audiobook.progress')}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
        style={[styles.track, { backgroundColor: toneAlpha(tone2, 0.15) }]}
      >
        <ProgressFill pct={pct} color={tone2} />
      </View>

      {error ? (
        <View testID="audiobook-error" accessibilityLiveRegion="polite" style={styles.errorRow}>
          <Text size="sm" muted style={styles.flex}>
            {error === 'unavailable' ? t('screens.audiobook.unavailable') : error === 'empty' ? t('screens.audiobook.empty') : t('screens.audiobook.network')}
          </Text>
          {error === 'unavailable' ? (
            <Pressable
              onPress={() => (track ? player.askVitana() : activateOrb())}
              accessibilityRole="button"
              testID="audiobook-error-ask-vitana"
              style={[styles.pill, { backgroundColor: tone2 }]}
            >
              <AudiobookIcon name="MessageCircle" size={16} color={colors.primaryForeground} />
              <Text size="sm" weight="500" style={{ color: colors.primaryForeground }}>
                {t('screens.audiobook.askVitana')}
              </Text>
            </Pressable>
          ) : error === 'network' ? (
            <Pressable onPress={player.retry} accessibilityRole="button" testID="audiobook-retry" style={[styles.pill, { backgroundColor: tone2 }]}>
              <Text size="sm" weight="500" style={{ color: colors.primaryForeground }}>
                {t('screens.audiobook.retry')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.controls}>
          <IconButton onPress={player.cycleRate} label={t('screens.audiobook.speed', { rate })} testID="audiobook-speed">
            <Text size="sm" weight="600" muted>
              {t('journeyAutopilotNative.audiobook.rateValue', { rate: number(rate) })}
            </Text>
          </IconButton>
          <IconButton onPress={player.previous} label={t('screens.audiobook.previous')} testID="audiobook-previous">
            <AudiobookIcon name="SkipBack" size={20} color={colors.mutedForeground} mirror />
          </IconButton>
          <Pressable
            onPress={player.toggle}
            disabled={finished}
            accessibilityRole="button"
            accessibilityLabel={playing ? t('screens.audiobook.pause') : t('screens.audiobook.play')}
            accessibilityState={{ disabled: finished }}
            testID="audiobook-play-pause"
            style={[styles.play, { backgroundColor: tone2, opacity: finished ? 0.4 : 1 }]}
          >
            {loading ? (
              <Spinner color={colors.primaryForeground} />
            ) : playing ? (
              <AudiobookIcon name="Pause" size={24} color={colors.primaryForeground} />
            ) : (
              <View style={styles.playNudge}>
                <AudiobookIcon name="Play" size={24} color={colors.primaryForeground} mirror />
              </View>
            )}
          </Pressable>
          <IconButton onPress={player.next} label={t('screens.audiobook.next')} testID="audiobook-next">
            <AudiobookIcon name="SkipForward" size={20} color={colors.mutedForeground} mirror />
          </IconButton>
          <IconButton
            onPress={player.cycleSleep}
            label={sleepMinutes ? t('screens.audiobook.sleepOn', { min: sleepMinutes }) : t('screens.audiobook.sleepOff')}
            testID="audiobook-sleep"
          >
            <View style={styles.sleep}>
              <AudiobookIcon name="Moon" size={20} color={sleepMinutes ? tone2 : colors.mutedForeground} />
              {sleepMinutes ? (
                <Text size="xs" weight="600" style={[styles.sleepText, { color: tone2 }]}>
                  {t('journeyAutopilotNative.audiobook.sleepShort', { min: number(sleepMinutes) })}
                </Text>
              ) : null}
            </View>
          </IconButton>
        </View>
      )}

      {!error ? (
        <Pressable onPress={player.askVitana} accessibilityRole="button" testID="audiobook-ask-vitana" style={styles.ask}>
          <AudiobookIcon name="MessageCircle" size={16} color={tone2} />
          <Text size="sm" weight="500" style={{ color: tone2 }}>
            {t('screens.audiobook.askVitana')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    start: 12,
    end: 12,
    zIndex: 50,
    elevation: 24,
    borderWidth: 1,
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 25 },
  },
  clip: { overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0 },
  summary: { marginBottom: 12, borderRadius: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  tryIt: { marginTop: 8, height: 36, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12 },
  smallButton: { height: 36, minWidth: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 20 },
  badgeIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.6 },
  track: { marginTop: 12, height: 6, width: '100%', overflow: 'hidden', borderRadius: 999 },
  fill: { height: '100%', borderRadius: 999 },
  errorRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16 },
  controls: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  iconButton: { height: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 4 },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  playNudge: { marginStart: 2 },
  sleep: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sleepText: { fontSize: 11 },
  ask: { marginTop: 4, minHeight: 44, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999 },
});
