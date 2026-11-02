/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — `/memory/timeline`
 * (MEMORY.TIMELINE), body-port of the web `src/pages/memory/Timeline.tsx`
 * phone layout → `TimelineBody.tsx`: the Vitana Index spotlight (loading /
 * error + retry / no Index yet), the pillar chips and the "More" area chips,
 * the search box (2+ characters), clear filters, the transparency line, then
 * the days (today / yesterday / weekday) with their moments, Index changes and
 * digests, loading / error + retry / empty states, "load more" through the
 * gateway cursor, and the moment detail sheet. The web's native
 * `<input type="date">` jump-to-date has no N2 kit counterpart yet and is
 * not part of this port.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, TextInput, useUITheme } from '../../ports/ui';
import { MemoryIcon, useMemoryPalette } from '../../ports/memory';
import { navigateToWebPath } from '../../navigation/navigate';
import { CardSkeleton, MemoryScaffold, NoticeBox } from './components';
import { useMemoryText } from './text';
import { PILLAR_KEYS, useTimeline, useTimelineSpotlight, type PillarKey, type TimelineItem } from './data/timeline';
import { DigestRow, IndexDayRow, IndexSpotlightCard, MomentRow, PILLAR_ICON } from './timeline/parts';
import { TimelineDetailSheet } from './timeline/DetailSheet';

/** Life categories under "More" (web timeline-meta LIFE_CATEGORIES). */
const LIFE_CATEGORIES = ['index', 'cross_pillar', 'diary', 'goals', 'journey', 'vitana', 'community', 'events', 'live_media', 'shop', 'wallet', 'account'] as const;

function localDay(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const dayOf = (item: TimelineItem) => (item.kind === 'moment' ? localDay(item.at) : item.date);

function Chip({ active, onPress, children, testID }: { active: boolean; onPress: () => void; children: ReactNode; testID?: string }) {
  return (
    <Button size="xs" variant={active ? 'default' : 'outline'} accessibilityState={{ selected: active }} onPress={onPress} testID={testID}>
      {children}
    </Button>
  );
}

export function MemoryTimeline() {
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  const palette = useMemoryPalette();
  const [pillar, setPillar] = useState<PillarKey | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const q = query.trim();
  const filters = useMemo(() => ({ pillar, category, q: q.length >= 2 ? q : null }), [pillar, category, q]);
  const spotlight = useTimelineSpotlight();
  const list = useTimeline(filters);

  const days = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const it of list.items) {
      const d = dayOf(it);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(it);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [list.items]);

  const dayHeading = (day: string) => {
    if (day === localDay(new Date().toISOString())) return t('timeline.day.today');
    if (day === localDay(new Date(Date.now() - 86_400_000).toISOString())) return t('timeline.day.yesterday');
    return x.fmtDate(`${day}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const filtered = !!(pillar || category || filters.q);

  return (
    <MemoryScaffold active="timeline" title={t('timeline.header.title')} description={t('timeline.header.description')} emoji="🧭" testID="screen-memory-timeline">
      <View style={styles.body} testID="timeline-body">
        {spotlight.isLoading ? (
          <CardSkeleton />
        ) : spotlight.isError ? (
          <NoticeBox testID="timeline-spotlight-error" message={t('timeline.spotlight.error')} retryLabel={t('timeline.retry')} onRetry={() => void spotlight.refetch()} />
        ) : spotlight.data ? (
          <IndexSpotlightCard spotlight={spotlight.data} />
        ) : (
          <NoticeBox testID="timeline-no-index" message={t('timeline.spotlight.empty')}>
            <PressableRow onPress={() => navigateToWebPath('/health/vitana-index')} accessibilityRole="link">
              <Text weight="600" color={colors.primary}>
                {t('timeline.spotlight.start')}
              </Text>
            </PressableRow>
          </NoticeBox>
        )}

        <View style={styles.filters}>
          <View style={styles.chips} accessibilityLabel={t('timeline.filters.pillarsLabel')}>
            <Chip active={!pillar && !category} onPress={() => (setPillar(null), setCategory(null))} testID="timeline-chip-all">
              {t('timeline.filters.all')}
            </Chip>
            {PILLAR_KEYS.map((p) => (
              <Chip key={p} active={pillar === p} onPress={() => (setCategory(null), setPillar(pillar === p ? null : p))} testID={`timeline-chip-${p}`}>
                <View style={styles.chipLabel}>
                  <MemoryIcon name={PILLAR_ICON[p]} size={14} color={pillar === p ? colors.primaryForeground : palette.pillar[p].accent} />
                  <Text variant="caption" color={pillar === p ? colors.primaryForeground : colors.foreground}>
                    {x.pillarLabel(p)}
                  </Text>
                </View>
              </Chip>
            ))}
            <Chip active={showMore || !!category} onPress={() => setShowMore((v) => !v)} testID="timeline-chip-more">
              {t('timeline.filters.more')}
            </Chip>
          </View>
          {showMore || category ? (
            <View style={styles.chips} accessibilityLabel={t('timeline.filters.categoriesLabel')} testID="timeline-categories">
              {LIFE_CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onPress={() => (setPillar(null), setCategory(category === c ? null : c))} testID={`timeline-cat-${c}`}>
                  {t(`timeline.category.${c}`)}
                </Chip>
              ))}
            </View>
          ) : null}
          <View style={styles.searchRow}>
            <View style={styles.fill}>
              <TextInput value={query} onChangeText={setQuery} placeholder={t('timeline.searchPlaceholder')} accessibilityLabel={t('timeline.searchPlaceholder')} testID="timeline-search" />
            </View>
            {filtered ? (
              <Button variant="ghost" size="sm" onPress={() => (setPillar(null), setCategory(null), setQuery(''))} testID="timeline-clear">
                {t('timeline.filters.clear')}
              </Button>
            ) : null}
          </View>
          <View style={styles.transparency} testID="timeline-transparency">
            <Text variant="caption" muted>
              {t('timeline.transparency')}
            </Text>
            <PressableRow onPress={() => navigateToWebPath('/memory/permissions')} accessibilityRole="link" testID="timeline-transparency-link">
              <Text variant="caption" weight="600" color={colors.primary}>
                {t('timeline.transparencyLink')}
              </Text>
            </PressableRow>
          </View>
        </View>

        {list.isLoading ? (
          <View style={styles.rows} testID="timeline-loading">
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} height={56} />
            ))}
          </View>
        ) : list.isError ? (
          <NoticeBox testID="timeline-error" message={t('timeline.error')} retryLabel={t('timeline.retry')} onRetry={() => void list.refetch()} />
        ) : days.length === 0 ? (
          <NoticeBox testID="timeline-empty" message={t(filtered ? 'timeline.emptyFiltered' : 'timeline.empty')} />
        ) : (
          <View style={styles.days}>
            {days.map(([day, items]) => (
              <View key={day} accessibilityLabel={dayHeading(day)} testID="timeline-day" style={styles.rows}>
                <Text variant="label" muted accessibilityRole="header">
                  {dayHeading(day)}
                </Text>
                {items.map((it) =>
                  it.kind === 'moment' ? <MomentRow key={it.id} item={it} onOpen={setOpenId} /> : it.kind === 'index_day' ? <IndexDayRow key={it.id} item={it} /> : <DigestRow key={it.id} item={it} />,
                )}
              </View>
            ))}
            {list.hasNextPage ? (
              <View style={styles.more}>
                <Button variant="outline" size="sm" disabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} testID="timeline-load-more">
                  {t('memoryNative.timeline.loadMore')}
                </Button>
              </View>
            ) : null}
            {list.isFetchingNextPage ? <CardSkeleton height={56} /> : null}
          </View>
        )}
      </View>
      <TimelineDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </MemoryScaffold>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  filters: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  transparency: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  rows: { gap: 8 },
  days: { gap: 20 },
  more: { alignItems: 'center' },
});
