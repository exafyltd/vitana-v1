/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the Memory overview's
 * top cards, native twins of the web `IndexWeekStory.tsx`, `RoutinesCard.tsx`
 * (src/components/memory/learning/) and `WhatVitanaKnows.tsx`
 * (src/components/memory/). Same data, same states, same navigation targets.
 */
import { StyleSheet, View } from 'react-native';
import { Button, Text, notifyError, useUITheme } from '../../../ports/ui';
import { MemoryIcon, notifySuccess } from '../../../ports/memory';
import { navigateToWebPath } from '../../../navigation/navigate';
import { CardSkeleton, MemoryCard } from '../components';
import { useMemoryText } from '../text';
import { PILLAR_KEYS, useTimelineSpotlight } from '../data/timeline';
import { useForgetRoutine, useRoutines } from '../data/learning';
import { useSelfAwareness } from '../data/garden';

export function IndexWeekStory() {
  const { data, isLoading } = useTimelineSpotlight();
  const x = useMemoryText();
  const { t } = x;
  if (isLoading) return <CardSkeleton />;
  if (!data) {
    return (
      <MemoryCard
        testID="memory-week-empty"
        eyebrow={t('memoryLearning.week.title')}
        eyebrowIcon="Gauge"
        title={t('memoryLearning.week.empty')}
        actions={
          <Button size="sm" onPress={() => navigateToWebPath('/health/vitana-index')}>
            {t('memoryLearning.week.start')}
          </Button>
        }
      />
    );
  }
  const rising = PILLAR_KEYS.filter((p) => data.pillars[p]?.momentum === 'rising').map(x.pillarLabel);
  const slipping = PILLAR_KEYS.filter((p) => data.pillars[p]?.momentum === 'slipping').map(x.pillarLabel);
  const weakest = data.balance.weakest_pillar ?? data.weakest_pillar;
  const balance =
    data.balance.penalty_pct > 0 && weakest
      ? t('timeline.balance.held_back', { pillar: x.pillarLabel(weakest), pct: x.fmtNumber(data.balance.penalty_pct) })
      : t('timeline.balance.full');
  const change =
    typeof data.change_7d === 'number' && data.change_7d !== 0 ? t('memoryLearning.week.change', { delta: x.signed(data.change_7d) }) : t('memoryLearning.week.noChange');

  return (
    <MemoryCard
      testID="memory-week-story"
      eyebrow={t('memoryLearning.week.title')}
      eyebrowIcon="Gauge"
      title={
        <View style={styles.scoreRow}>
          <Text style={styles.score} weight="700">
            {x.fmtNumber(data.score_total)}
          </Text>
          <Text muted variant="caption">
            {`${x.tierLabel(data.tier)} · ${change}`}
          </Text>
        </View>
      }
      actions={
        <Button variant="outline" size="sm" onPress={() => navigateToWebPath('/memory/timeline')} testID="memory-week-open-timeline">
          {t('memoryLearning.week.openTimeline')}
        </Button>
      }
    >
      {rising.length > 0 ? <Text testID="memory-week-rising">{t('memoryLearning.week.rising', { pillars: rising.join(', ') })}</Text> : null}
      {slipping.length > 0 ? <Text testID="memory-week-slipping">{t('memoryLearning.week.slipping', { pillars: slipping.join(', ') })}</Text> : null}
      {rising.length === 0 && slipping.length === 0 ? <Text>{t('memoryLearning.week.steady')}</Text> : null}
      <Text muted>{balance}</Text>
    </MemoryCard>
  );
}

export function RoutinesCard() {
  const { data, isLoading, isError } = useRoutines();
  const forget = useForgetRoutine();
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  if (isLoading) return <CardSkeleton />;
  if (isError) return null;
  const routines = data ?? [];
  return (
    <MemoryCard
      testID="memory-routines"
      eyebrow={t('memoryLearning.routines.title')}
      eyebrowIcon="Repeat"
      title={t('memoryLearning.routines.description')}
      actions={
        <Button variant="link" size="sm" onPress={() => navigateToWebPath('/memory/permissions')} testID="memory-routines-manage">
          {t('memoryLearning.routines.manage')}
        </Button>
      }
    >
      {routines.length === 0 ? (
        <Text muted testID="memory-routines-empty">
          {t('memoryLearning.routines.empty')}
        </Text>
      ) : (
        <View>
          {routines.map((r, i) => {
            const sentence = x.routineSentence(r);
            return (
              <View key={r.id} testID="memory-routine" style={[styles.routine, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null]}>
                <Text style={styles.fill}>{sentence}</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={forget.isPending}
                  accessibilityLabel={`${t('memoryLearning.routines.forget')}: ${sentence}`}
                  testID={`memory-routine-forget-${r.id}`}
                  onPress={() =>
                    forget.mutate(r.id, {
                      onSuccess: () => notifySuccess('memoryLearning.toast.forgotten'),
                      onError: () => notifyError('memoryLearning.toast.saveFailed'),
                    })
                  }
                >
                  <MemoryIcon name="X" size={16} />
                </Button>
              </View>
            );
          })}
        </View>
      )}
    </MemoryCard>
  );
}

export function WhatVitanaKnows() {
  const { data, isLoading } = useSelfAwareness();
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  if (isLoading || !data?.ok || !data.items?.length) return null;
  const refreshedAgo = data.last_refreshed_at ? x.timeAgo(data.last_refreshed_at) : '';
  return (
    <MemoryCard
      testID="memory-what-vitana-knows"
      title={
        <View style={styles.knowsTitle}>
          <MemoryIcon name="Sparkles" size={16} color={colors.primary} />
          <Text weight="600">{t('screens.memory.whatVitanaRemembersAboutYou')}</Text>
        </View>
      }
      meta={refreshedAgo ? t('screens.memory.updatedAgo', { distance: refreshedAgo }) : undefined}
      actions={
        <>
          <Button variant="outline" size="sm" onPress={() => navigateToWebPath(data.user_controls.edit_memory_url)}>
            {t('screens.memory.editWhatIRemember')}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => navigateToWebPath(data.user_controls.pause_proactivity_url)}>
            {t('screens.memory.pauseProactivity')}
          </Button>
        </>
      }
    >
      {data.items.map((item, idx) => (
        <View key={`${item.kind}-${idx}`} style={styles.knowsRow} testID="memory-knows-item">
          <MemoryIcon name="ChevronRight" size={16} color={colors.mutedForeground} />
          <Text style={styles.fill}>
            <Text weight="600">{`${item.label}: `}</Text>
            <Text muted>{item.value}</Text>
          </Text>
        </View>
      ))}
    </MemoryCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 },
  score: { fontSize: 24, lineHeight: 30 },
  routine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  fill: { flex: 1 },
  knowsTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  knowsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
