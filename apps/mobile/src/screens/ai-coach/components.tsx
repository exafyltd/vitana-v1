/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the building blocks the
 * five `/ai` pages share. The web pages render `AppLayout` (the phone's
 * MobileAppShell: the N3 shell supplies it) + `SubNavigation` + a header and
 * a one-column card stack on phones (`columns-1` below `md`). `CoachScaffold`
 * is the sub-navigation (web `aiNavigation` / `aiSubItems`), the page
 * padding and the header: the overview's mobile `StandardHeader` (title
 * only, `StandardHeader.tsx:42-50`) or the other pages' header card + the
 * small Vitana Index circle card that opens the Index. `RewardDot` is the
 * web `ui/reward-dot.tsx` (pulse + ping; the hover tooltip is the kit's
 * long-press hint). Ports only; logical start/end; every string arrives
 * translated.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text, useUITheme } from '../../ports/ui';
import { Tooltip, TooltipContent, TooltipTrigger, useCoachPalette, useReducedMotion } from '../../ports/ai-coach';
import { navigateToWebPath } from '../../navigation/navigate';
import { useCoachText } from './text';

export type CoachSection = 'overview' | 'insights' | 'recommendations' | 'daily-summary' | 'companion';

/** Web `aiNavigation` (src/config/navigation.ts:6-12) = the pages' `aiSubItems`. */
export const COACH_NAV: ReadonlyArray<{ id: CoachSection; path: string; key: string }> = [
  { id: 'overview', path: '/ai', key: 'overview' },
  { id: 'insights', path: '/ai/insights', key: 'insights' },
  { id: 'recommendations', path: '/ai/recommendations', key: 'recommendations' },
  { id: 'daily-summary', path: '/ai/daily-summary', key: 'dailySummary' },
  { id: 'companion', path: '/ai/companion', key: 'companion' },
];

/** Web `SubNavigation`: a horizontally scrolling row of pills; the active one is `bg-muted shadow-md`. */
export function CoachSubNav({ active }: { active: CoachSection }) {
  const { t } = useCoachText();
  const { colors } = useUITheme();
  return (
    <View style={[styles.subNavBar, { borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNav} accessibilityRole="tablist" accessibilityLabel={t('aiCoachNative.nav.label')} testID="coach-subnav">
        {COACH_NAV.map((item) => {
          const on = item.id === active;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => (on ? undefined : navigateToWebPath(item.path))}
              style={[styles.subNavItem, on ? { backgroundColor: colors.muted } : null]}
              testID={`coach-subnav-${item.id}`}
            >
              <Text size="sm" weight="500" muted={!on}>
                {t(`aiCoachNative.nav.${item.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The `w-16 h-16` Vitana Index circle (`from-status-success/30 to-status-info/30`) with the score in `text-status-success`. */
export function IndexCircle({ value, testID }: { value: string; testID?: string }) {
  const p = useCoachPalette();
  return (
    <View style={styles.circle}>
      <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="coachIndexCircle" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.statusSuccess} stopOpacity={0.3} />
            <Stop offset="1" stopColor={p.statusInfo} stopOpacity={0.3} />
          </LinearGradient>
        </Defs>
        <Circle cx={32} cy={32} r={32} fill="url(#coachIndexCircle)" />
      </Svg>
      <Text size="xl" weight="700" color={p.statusSuccess} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The page: sub-navigation, then `p-6` with the header and the cards. `header`
 * `'title'` is the overview's mobile StandardHeader; `'card'` the header card
 * + the Index card (`onPress` → `/health-tracker/vitana-index`).
 */
export function CoachScaffold({
  active,
  title,
  description,
  header,
  indexValue,
  children,
  testID,
}: {
  active: CoachSection;
  title: string;
  description?: string;
  header: 'title' | 'card';
  indexValue?: string;
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useUITheme();
  const { t } = useCoachText();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} keyboardShouldPersistTaps="handled">
      <CoachSubNav active={active} />
      <View style={styles.page}>
        {header === 'title' ? (
          <View style={styles.titleOnly}>
            <Text size="lg" weight="700" accessibilityRole="header">
              {title}
            </Text>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text size="2xl" weight="700" accessibilityRole="header" style={styles.headerTitle}>
                {title}
              </Text>
              {description ? <Text muted>{description}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.ai.dailySummaryOpenIndex')}
              onPress={() => navigateToWebPath('/health-tracker/vitana-index')}
              style={[styles.indexCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              testID="coach-index-card"
            >
              <IndexCircle value={indexValue ?? '…'} testID="coach-index-value" />
            </Pressable>
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

/** One-column card stack (the web masonry is `columns-1` on phones, `gap-4`). */
export function CardStack({ children, inset, testID }: { children: ReactNode; inset?: boolean; testID?: string }) {
  return (
    <View style={[styles.stack, inset ? styles.inset : null]} testID={testID}>
      {children}
    </View>
  );
}

/**
 * Web `RewardDot` (top-right inside the card, `w-3 h-3`, purple, the points
 * when > 0, `animate-pulse` + an `animate-ping` glow). Reduced motion stops
 * both. The web hover tooltip (points + description) is the kit's long-press hint.
 */
export function RewardDot({ points, description, testID = 'reward-dot' }: { points?: number; description: string; testID?: string }) {
  const p = useCoachPalette();
  const { colors } = useUITheme();
  const { t } = useCoachText();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  const ping = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.timing(ping, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [reduced, pulse, ping]);
  const label = points ? `${t('screens.ui.pointsCredits', { points })} · ${description}` : description;
  return (
    <View style={styles.dotWrap} pointerEvents="box-none">
      <Tooltip>
        <TooltipTrigger accessibilityLabel={label} testID={testID}>
          <Animated.View style={[styles.dot, { backgroundColor: p.reward, opacity: pulse }]}>
            {!reduced ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.dotGlow,
                  { backgroundColor: p.reward, transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [1.5, 2.5] }) }], opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0] }) },
                ]}
              />
            ) : null}
            {points ? (
              <Text style={styles.dotText} weight="700" color={colors.primaryForeground}>
                {points > 99 ? '99+' : String(points)}
              </Text>
            ) : null}
          </Animated.View>
        </TooltipTrigger>
        <TooltipContent>
          <View style={styles.tip}>
            {points ? (
              <Text size="sm" weight="600" color={p.reward}>
                {t('screens.ui.pointsCredits', { points })}
              </Text>
            ) : null}
            <Text size="xs" muted>
              {description}
            </Text>
          </View>
        </TooltipContent>
      </Tooltip>
    </View>
  );
}

const styles = StyleSheet.create({
  subNavBar: { borderBottomWidth: 1, paddingVertical: 12 },
  subNav: { gap: 4, paddingHorizontal: 24 },
  subNavItem: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  page: { padding: 24, gap: 24 },
  titleOnly: { paddingTop: 4 },
  headerRow: { gap: 24 },
  headerCard: { borderWidth: 1, borderRadius: 16, padding: 32 },
  headerTitle: { marginBottom: 8 },
  indexCard: { width: 128, borderWidth: 1, borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: 16 },
  inset: { paddingHorizontal: 24 },
  dotWrap: { position: 'absolute', top: 8, end: 8, zIndex: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dotGlow: { borderRadius: 6 },
  dotText: { fontSize: 8, lineHeight: 10 },
  tip: { gap: 2, alignItems: 'center' },
});
