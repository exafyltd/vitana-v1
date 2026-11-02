/**
 * VTID-05461 — the Full-App feed tiles of My Journey, twins of
 * `src/components/journey/`:
 *  - `FutureSelfTiles.tsx`  "your future self": time anchor, visioning line, three identity tiles, affirmation;
 *  - `TodaysGoalCard.tsx`   today's actions with progress, the all-done line and "see today's plan";
 *  - `MatchesPreview.tsx`   up to 3 real matches (`daily_matches`), marked viewed; "see all" → /me/matches, a row → /u/:id;
 *  - `EventsPreview.tsx`    the 2 nearest community events; "see all" / a card → /comm/events-meetups?tab=hot(&event=…);
 *  - `AutopilotCard.tsx`    the top 3 Autopilot actions with priority dots; tap opens the popup.
 * Standard tiles of the dashboard archetype (web `Card rounded-2xl`), tokens only.
 *
 * Deviation, recorded: EventsPreview's demo-event fallback (`useDemoMatches`
 * events, EventsPreview.tsx:44-52) is not carried — its titles are hardcoded
 * English literals (useDemoMatches.ts:613-743), which the native i18n rule
 * forbids; with no real events the tile shows its empty line (web :73-76).
 * The daily-goal celebration (`celebrate({ kind: "daily-goal" })`,
 * TodaysGoalCard.tsx:34-36) is the app-wide milestone modal + confetti layer
 * (src/lib/celebrate.ts:408-432), a shell surface with no native twin yet; the
 * card itself (all-done line) is ported, the global celebration is not.
 */
import { useMemo, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { alpha, ButtonIcon, JourneyIcon, Progress, useToneColor, type AutopilotAction, type MyJourneyGoal } from '../../ports/journey';
import { navigateToWebPath } from '../../navigation/navigate';
import { useJourneyText } from './text';
import { useCommunityEvents, useMarkMatchesViewed, useRealMatches } from './data/supabase';
import { JourneyCard, Pill } from './components';

// ── future self ──────────────────────────────────────────────────────────
const FUTURE_TILES = [
  { id: 'stronger', icon: 'Flame', titleKey: 'screens.autopilotdashboard.futureSelfStrongerTitle', subKey: 'screens.autopilotdashboard.futureSelfStrongerSub' },
  { id: 'calmer', icon: 'Moon', titleKey: 'screens.autopilotdashboard.futureSelfCalmerTitle', subKey: 'screens.autopilotdashboard.futureSelfCalmerSub' },
  { id: 'energy', icon: 'Zap', titleKey: 'screens.autopilotdashboard.futureSelfEnergyTitle', subKey: 'screens.autopilotdashboard.futureSelfEnergySub' },
] as const;

export function FutureSelfTiles({ goal }: { goal?: MyJourneyGoal | null }): ReactElement {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const pink = useToneColor('category-4');
  const blue = useToneColor('category-7');
  const tileColors = [pink, blue, violet];
  const months = goal?.has_deadline && goal.days_to_deadline && goal.days_to_deadline > 20 ? Math.max(1, Math.round(goal.days_to_deadline / 30)) : null;
  const anchor = months ? t('screens.autopilotdashboard.futureSelfInMonths', { months }) : t('screens.autopilotdashboard.futureSelfHint');
  return (
    <View testID="journey-future-self">
      <View style={styles.futureHeader}>
        <Text size="xs" weight="700" muted accessibilityRole="header" style={styles.track}>
          {t('screens.autopilotdashboard.futureSelfTitle').toUpperCase()}
        </Text>
        <View style={styles.inline}>
          <JourneyIcon name="Sparkles" size={12} color={violet} />
          <Text size="xs" weight="600" color={violet} testID="journey-future-anchor">
            {anchor}
          </Text>
        </View>
      </View>
      <View style={[styles.vision, { borderColor: alpha(colors.border, 0.6), backgroundColor: alpha(pink, 0.1) }]}>
        <Text editorial weight="600" color={violet} style={styles.visionText}>
          {t('screens.autopilotdashboard.futureSelfVision')}
        </Text>
      </View>
      <View style={styles.tiles}>
        {FUTURE_TILES.map((tile, i) => (
          <View key={tile.id} testID={`journey-future-${tile.id}`} style={[styles.tile, { backgroundColor: tileColors[i] }]}>
            <View style={[styles.tileIcon, { backgroundColor: alpha(colors.card, 0.9) }]}>
              <JourneyIcon name={tile.icon} size={14} color={violet} />
            </View>
            <View style={styles.tileText}>
              <Text editorial weight="700" color={colors.primaryForeground} style={styles.tileTitle}>
                {t(tile.titleKey)}
              </Text>
              <Text size="xs" weight="500" color={alpha(colors.primaryForeground, 0.9)}>
                {t(tile.subKey)}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text editorial weight="600" color={violet} style={styles.becoming}>
        {t('screens.autopilotdashboard.futureSelfBecoming')} ✨
      </Text>
    </View>
  );
}

// ── today's goal ─────────────────────────────────────────────────────────
export interface TodayAction {
  id: string;
  title: string;
  status: string;
}

export function TodaysGoalCard({ actions, loading, onOpenAutopilot }: { actions: TodayAction[]; loading: boolean; onOpenAutopilot: () => void }): ReactElement {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const total = actions.length;
  const done = actions.filter((a) => a.status === 'completed').length;
  const allDone = total > 0 && done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <JourneyCard tint={colors.statusWarning} testID="journey-todays-goal">
      <View style={styles.gap12}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <JourneyIcon name="Flag" size={16} color={colors.statusWarning} />
            <Text size="sm" weight="600">
              {t('screens.autopilotdashboard.todaysGoal')}
            </Text>
          </View>
          {total > 0 ? (
            <Pill color={colors.statusWarning} background={alpha(colors.statusWarning, 0.15)} testID="journey-today-count">
              {t('screens.autopilotdashboard.todayDoneOfTotal', { done, total })}
            </Pill>
          ) : null}
        </View>
        {loading ? (
          <View testID="journey-today-loading" style={[styles.bar, { backgroundColor: alpha(colors.statusWarningSubtle, 0.6) }]} />
        ) : total === 0 ? (
          <Text size="sm" muted testID="journey-today-empty">
            {t('empty.myJourneyOnePillar')}
          </Text>
        ) : (
          <>
            <Progress value={pct} style={styles.progress} />
            {allDone ? (
              <Text size="sm" weight="500" color={colors.statusSuccess} testID="journey-today-all-done">
                {t('screens.autopilotdashboard.todayAllDone')}
              </Text>
            ) : (
              <View style={styles.list}>
                {actions.slice(0, 4).map((a) => {
                  const completed = a.status === 'completed';
                  return (
                    <View key={a.id} style={styles.inline} testID={`journey-today-${a.id}`}>
                      <JourneyIcon name={completed ? 'CheckCircle2' : 'Circle'} size={16} color={completed ? colors.statusSuccess : colors.mutedForeground} />
                      <Text size="sm" muted={completed} style={completed ? styles.strike : undefined}>
                        {a.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Button variant="ghost" size="sm" onPress={onOpenAutopilot} testID="journey-today-open">
              {t('screens.autopilotdashboard.seeTodaysPlan')}
              <ButtonIcon name="ChevronRight" size={14} />
            </Button>
          </>
        )}
      </View>
    </JourneyCard>
  );
}

// ── matches ──────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MatchesPreview({ limit = 3 }: { limit?: number }): ReactElement {
  const { t, localizeMatchReason } = useJourneyText();
  const { colors } = useUITheme();
  const pink = useToneColor('category-4');
  const { data: matches, isLoading } = useRealMatches(limit);
  const list = (matches ?? []).slice(0, limit);
  useMarkMatchesViewed(list.map((m) => m.user_id));
  return (
    <JourneyCard tint={pink} testID="journey-matches">
      <View style={styles.gap12}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <JourneyIcon name="Heart" size={16} color={pink} />
            <Text size="sm" weight="600" color={pink} accessibilityRole="header">
              {t('screens.autopilotdashboard.matchesTitle')}
            </Text>
          </View>
          <Pressable testID="journey-matches-all" accessibilityRole="link" onPress={() => navigateToWebPath('/me/matches')} style={styles.inline}>
            <Text size="xs" weight="600" color={pink}>
              {t('screens.autopilotdashboard.matchesSeeAll')}
            </Text>
            <JourneyIcon name="ChevronRight" size={12} color={pink} />
          </Pressable>
        </View>
        {isLoading ? (
          <View style={styles.centerBox}>
            <Spinner accessibilityLabel={t('common.loading')} />
          </View>
        ) : list.length === 0 ? (
          <Text size="xs" muted testID="journey-matches-empty">
            {t('screens.autopilotdashboard.matchesEmpty')}
          </Text>
        ) : (
          <View style={styles.list}>
            {list.map((m) => {
              const name = m.display_name || t('screens.home.communityMember');
              return (
                <Pressable
                  key={m.user_id}
                  testID={`journey-match-${m.user_id}`}
                  accessibilityRole="link"
                  onPress={() => navigateToWebPath(`/u/${m.user_id}`)}
                  style={[styles.matchRow, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(pink, 0.1) }]}
                >
                  <Avatar uri={m.avatar_url} fallback={initials(name)} size={40} />
                  <View style={styles.flex}>
                    <Text size="sm" weight="600" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text size="xs" muted numberOfLines={1}>
                      {localizeMatchReason(m.match_reason) || t('screens.autopilotdashboard.matchReasonDefault')}
                    </Text>
                  </View>
                  <Pill color={colors.primaryForeground} background={pink}>
                    {`${m.compatibility_score}%`}
                  </Pill>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </JourneyCard>
  );
}

// ── events ───────────────────────────────────────────────────────────────
export function EventsPreview({ limit = 2 }: { limit?: number }): ReactElement {
  const { t, formatDate, fmtTime } = useJourneyText();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const pink = useToneColor('category-4');
  const { todayEvents, upcomingEvents } = useCommunityEvents();
  const items = useMemo(
    () =>
      [...todayEvents, ...upcomingEvents].slice(0, limit).map((e) => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        participant_count: e.participant_count,
        online: !!e.virtual_link,
        image_url: e.image_url,
      })),
    [todayEvents, upcomingEvents, limit],
  );
  const fills = [pink, violet];
  return (
    <JourneyCard tint={colors.statusWarning} testID="journey-events">
      <View style={styles.gap12}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <JourneyIcon name="Sparkles" size={16} color={colors.statusWarning} />
            <Text size="sm" weight="600" color={colors.statusWarning} accessibilityRole="header">
              {t('screens.autopilotdashboard.eventsTitle')}
            </Text>
          </View>
          <Pressable testID="journey-events-all" accessibilityRole="link" onPress={() => navigateToWebPath('/comm/events-meetups?tab=hot')} style={styles.inline}>
            <Text size="xs" weight="600" color={colors.statusWarning}>
              {t('screens.autopilotdashboard.eventsSeeAll')}
            </Text>
            <JourneyIcon name="ChevronRight" size={12} color={colors.statusWarning} />
          </Pressable>
        </View>
        {items.length === 0 ? (
          <Text size="xs" muted testID="journey-events-empty">
            {t('screens.autopilotdashboard.eventsEmpty')}
          </Text>
        ) : (
          <View style={styles.eventGrid}>
            {items.map((e, i) => (
              <Pressable
                key={e.id}
                testID={`journey-event-${e.id}`}
                accessibilityRole="link"
                onPress={() => navigateToWebPath(`/comm/events-meetups?tab=hot&event=${e.id}`)}
                style={[styles.eventCard, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.statusWarning, 0.1) }]}
              >
                <View style={[styles.eventImage, { backgroundColor: e.image_url ? colors.muted : fills[i % fills.length] }]}>
                  {e.image_url ? <Image source={{ uri: e.image_url }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors /> : null}
                  <View style={[styles.dateBadge, { backgroundColor: alpha(colors.card, 0.95) }]}>
                    <Text size="xs" weight="700" muted>
                      {formatDate(e.start_time, 'EEE').toUpperCase()}
                    </Text>
                    <Text editorial weight="600">
                      {formatDate(e.start_time, 'd')}
                    </Text>
                    <Text size="xs" weight="600" muted>
                      {formatDate(e.start_time, 'MMM').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventBody}>
                  <Text size="xs" weight="600" numberOfLines={2}>
                    {e.title}
                  </Text>
                  <Text size="xs" muted>
                    {`${fmtTime(e.start_time)} · ${e.online ? t('screens.autopilotdashboard.eventsOnline') : t('screens.autopilotdashboard.eventsAttending', { count: e.participant_count })}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </JourneyCard>
  );
}

// ── autopilot preview ────────────────────────────────────────────────────
export function AutopilotCard({ pendingCount, previewActions, onOpen }: { pendingCount: number; previewActions: AutopilotAction[]; onOpen: () => void }): ReactElement {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const blue = useToneColor('category-3');
  const hidden = Math.max(0, pendingCount - previewActions.length);
  const dot: Record<string, string> = { high: colors.statusError, medium: colors.statusWarning, low: colors.mutedForeground };
  return (
    <JourneyCard tint={blue} onPress={onOpen} accessibilityLabel={t('screens.autopilotdashboard.openAutopilot')} testID="journey-autopilot-card">
      <View style={styles.gap12}>
        <View style={styles.between}>
          <View style={[styles.inline, styles.flex]}>
            <View style={[styles.planeDot, { backgroundColor: blue }]}>
              <JourneyIcon name="Plane" size={14} color={colors.primaryForeground} />
            </View>
            <View style={styles.flex}>
              <Text size="sm" weight="700" color={blue}>
                {t('screens.autopilotdashboard.autopilotCardTitle')}
              </Text>
              <Text size="xs" color={alpha(blue, 0.8)} numberOfLines={1}>
                {t('screens.autopilotdashboard.autopilotCardSubtitle')}
              </Text>
            </View>
          </View>
          {pendingCount > 0 ? (
            <Pill color={colors.primaryForeground} background={blue} testID="journey-autopilot-count">
              {pendingCount}
            </Pill>
          ) : (
            <JourneyIcon name="ChevronRight" size={16} color={blue} />
          )}
        </View>
        {previewActions.length === 0 ? (
          <Text size="xs" color={alpha(blue, 0.8)} testID="journey-autopilot-clear">
            {`${t('screens.autopilotdashboard.planAllClear')} ✨`}
          </Text>
        ) : (
          <View style={styles.list}>
            {previewActions.map((a) => (
              <View key={a.id} style={styles.inline} testID={`journey-autopilot-${a.id}`}>
                <View style={[styles.priority, { backgroundColor: dot[a.priority] ?? colors.muted }]} />
                <Text size="sm" numberOfLines={1} style={styles.flex}>
                  {a.title}
                </Text>
                {a.timeEstimate ? (
                  <Text size="xs" muted>
                    {a.timeEstimate}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
        {hidden > 0 ? (
          <View style={[styles.inline, styles.endRow]}>
            <Text size="xs" weight="600" color={blue}>
              {t('screens.autopilotdashboard.autopilotSeeAll', { count: hidden })}
            </Text>
            <JourneyIcon name="ChevronRight" size={14} color={blue} />
          </View>
        ) : null}
      </View>
    </JourneyCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gap12: { gap: 12 },
  list: { gap: 8 },
  track: { letterSpacing: 1 },
  futureHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8, marginTop: 20 },
  vision: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  visionText: { fontSize: 16.5, fontStyle: 'italic' },
  tiles: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  tile: { flex: 1, aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', justifyContent: 'space-between', padding: 8 },
  tileIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileText: { gap: 2 },
  tileTitle: { fontSize: 16 },
  becoming: { textAlign: 'center', marginHorizontal: 16, marginTop: 14, fontSize: 15.5, fontStyle: 'italic' },
  bar: { height: 8, borderRadius: 999 },
  progress: { height: 8 },
  strike: { textDecorationLine: 'line-through' },
  centerBox: { alignItems: 'center', paddingVertical: 16 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, borderWidth: 1 },
  eventGrid: { flexDirection: 'row', gap: 12 },
  eventCard: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  eventImage: { height: 80 },
  dateBadge: { position: 'absolute', top: 8, start: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, alignItems: 'center' },
  eventBody: { padding: 10, gap: 4 },
  planeDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  priority: { width: 8, height: 8, borderRadius: 4 },
  endRow: { justifyContent: 'flex-end' },
});
