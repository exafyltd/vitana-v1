/**
 * VTID-05450 — native twin of src/components/onboarding/OnboardingSpeech.tsx:
 * Vitana's welcome bubbles (catalog keys `screens.onboarding.speech*`, in the
 * web order) appear one at a time — 800 ms to the first, then 3 s + 12 ms per
 * character (capped at 4 s extra) — with a typing indicator while more are
 * coming and a "Skip intro" link; 2 s after the last bubble (600 ms after a
 * skip) the form opens. The list follows the newest bubble. Fades are skipped
 * under reduce motion.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { useOnboardingPalette, useReducedMotion, withAlpha } from '../../ports/onboarding';
import { useI18n } from '../../i18n/I18nProvider';

export const SPEECH_KEYS = [
  'screens.onboarding.speechWelcome',
  'screens.onboarding.speechNoRush',
  'screens.onboarding.speechAudiobook',
  'screens.onboarding.speechOrb',
  'screens.onboarding.speechNavigate',
  'screens.onboarding.speechActions',
  'screens.onboarding.speechGetToKnow',
] as const;

export const FIRST_DELAY = 800;
export const BASE_INTERVAL = 3000;
export const MS_PER_CHAR = 12;
export const FINAL_DELAY = 2000;
export const SKIP_DELAY = 600;

/** OnboardingSpeech.tsx `getMessageDelay`. */
export function getMessageDelay(messages: readonly string[], index: number): number {
  const msg = messages[index];
  if (!msg) return BASE_INTERVAL;
  return BASE_INTERVAL + Math.min(msg.length * MS_PER_CHAR, 4000);
}

/** The "V" orb avatar in front of each bubble. Decorative. */
export function VitanaAvatar({ size = 32 }: { size?: number }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { category4 } = useOnboardingPalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: category4, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: size >= 48 ? 18 : 12 }}>{t('onboardingNative.avatarInitial')}</Text>
    </View>
  );
}

function Bubble({ text, index }: { text: string; index: number }): ReactElement {
  const { colors } = useUITheme();
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return undefined;
    const anim = Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [fade, reduced]);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View testID={`onboarding-bubble-${index}`} style={[styles.row, { opacity: fade, transform: [{ translateY }] }]}>
      <View style={styles.avatarSlot}>
        <VitanaAvatar />
      </View>
      <View style={[styles.bubble, { backgroundColor: withAlpha(colors.card, 0.9) }]}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator(): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID="onboarding-typing" style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.avatarSlot}>
        <VitanaAvatar />
      </View>
      <View style={[styles.bubble, styles.dots, { backgroundColor: withAlpha(colors.card, 0.9) }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
        ))}
      </View>
    </View>
  );
}

export function OnboardingSpeech({ onComplete }: { onComplete: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const messages = SPEECH_KEYS.map((key) => t(key));
  // The timer chain reads the current language without restarting the sequence.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const [visibleCount, setVisibleCount] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, ms);
  }, []);

  const advance = useCallback(
    (prev: number) => {
      const next = prev + 1;
      setVisibleCount(next);
      if (next >= SPEECH_KEYS.length) schedule(() => completeRef.current(), FINAL_DELAY);
      else schedule(() => advance(next), getMessageDelay(messagesRef.current, next));
    },
    [schedule],
  );

  useEffect(() => {
    if (skipped) return undefined;
    schedule(() => advance(0), FIRST_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [advance, schedule, skipped]);

  // Its own timer: the sequence effect's cleanup (skipped flips) clears the chain timer.
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (skipTimer.current) clearTimeout(skipTimer.current);
    },
    [],
  );

  const handleSkip = () => {
    setSkipped(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisibleCount(SPEECH_KEYS.length);
    skipTimer.current = setTimeout(() => completeRef.current(), SKIP_DELAY);
  };

  const showMore = visibleCount < SPEECH_KEYS.length && !skipped;

  return (
    <View style={styles.root} testID="onboarding-speech">
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.slice(0, visibleCount).map((msg, i) => (
          <Bubble key={i} index={i} text={msg} />
        ))}
        {showMore ? <TypingIndicator /> : null}
      </ScrollView>
      {showMore ? (
        <View style={styles.skipRow}>
          <PressableRow testID="onboarding-skip" accessibilityRole="button" accessibilityLabel={t('onboarding.skipIntro')} onPress={handleSkip} style={styles.skip}>
            <Text variant="caption" style={{ color: withAlpha(colors.foreground, 0.7) }}>
              {t('onboarding.skipIntro')}
            </Text>
          </PressableRow>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  list: { paddingHorizontal: 16, paddingVertical: 24, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarSlot: { marginTop: 4 },
  bubble: { borderRadius: 16, borderTopStartRadius: 6, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '85%' },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  skipRow: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  skip: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
