/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the overview's
 * "Timeline" pane, native twin of the web `MemoryTimelineTab.tsx` with its
 * permanent `enableHorizontalCardsTimeline` card list: the garden entries
 * newest first, grouped by day, each card with its source (AI insight /
 * diary entry), category, confidence and age; a tap expands the card (type
 * and confidence for an insight, tags for a diary entry). The web card's
 * "Save as Knowledge" / "Delete" secondary actions only raise a success toast
 * and change nothing (`handlePromoteToKnowledge` / `handleDeleteActivity`),
 * so they are not reproduced; deleting a memory lives in the Garden detail.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, PressableRow, Text, useUITheme } from '../../../ports/ui';
import { MemoryIcon } from '../../../ports/memory';
import { CardSkeleton, NoticeBox } from '../components';
import { useKnowledgeBase, type KnowledgeItem } from '../data/garden';
import { useMemoryText } from '../text';
import { useTagLabel } from './Garden';

function dayKey(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function MemoryTimelineTab() {
  const x = useMemoryText();
  const { t } = x;
  const { knowledgeItems, isLoading, isError, refetch } = useKnowledgeBase();
  const groups = useMemo(() => {
    const sorted = [...knowledgeItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const map = new Map<string, KnowledgeItem[]>();
    for (const it of sorted) {
      const k = dayKey(it.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [knowledgeItems]);

  if (isLoading) {
    return (
      <View style={styles.list} testID="memory-timeline-tab-loading">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} height={128} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list} testID="memory-timeline-tab">
      <Text muted>{t('screens.memory.chronologicalViewYourKnowledgeBaseUpdates')}</Text>
      {isError ? (
        <NoticeBox testID="memory-timeline-tab-error" message={t('toasts.hooks.errorLoadingKnowledgeBase')} retryLabel={t('timeline.retry')} onRetry={() => void refetch()} />
      ) : groups.length === 0 ? (
        <NoticeBox testID="memory-timeline-tab-empty" message={t('screens.memory.noKnowledgeBaseEntriesYet')}>
          <Text variant="caption" muted>
            {t('screens.memory.startAddingMemoriesSeeThemHere')}
          </Text>
        </NoticeBox>
      ) : (
        groups.map(([day, items]) => (
          <View key={day} style={styles.day} testID="memory-timeline-tab-day">
            <Text variant="label" muted accessibilityRole="header">
              {x.fmtDate(`${day}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            {items.map((item) => (
              <EntryCard key={item.id} item={item} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function EntryCard({ item }: { item: KnowledgeItem }) {
  const x = useMemoryText();
  const { t } = x;
  const tagLabel = useTagLabel();
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const ai = item.source === 'ai';
  const label = ai ? t('screens.memory.aiInsight') : t('screens.memory.diaryEntry');
  const confidence = item.confidenceScore ? Math.round(item.confidenceScore * 100) : null;
  return (
    <PressableRow
      onPress={() => setOpen((v) => !v)}
      accessibilityLabel={`${label}: ${item.content}`}
      accessibilityState={{ checked: open }}
      testID={`memory-entry-${item.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.muted }]}>
        <MemoryIcon name={ai ? 'Brain' : 'FileText'} size={16} color={colors.primary} />
      </View>
      <View style={styles.fill}>
        <View style={styles.badges}>
          <Badge variant={ai ? 'default' : 'secondary'}>{label}</Badge>
          {item.memoryType ? <Badge variant="outline">{tagLabel(item.memoryType)}</Badge> : null}
          <Text variant="caption" muted style={styles.age}>
            {x.timeAgo(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.content}>{item.content}</Text>
        {confidence ? (
          <Text variant="caption" muted>
            {t('screens.memory.confidenceValue0', { value0: confidence })}
          </Text>
        ) : null}
        {open ? (
          <View style={styles.expanded} testID={`memory-entry-expanded-${item.id}`}>
            {ai ? (
              <Text variant="caption" muted>
                {`${t('screens.memory.type')} ${tagLabel(item.memoryType || 'general')}`}
              </Text>
            ) : (
              <View style={styles.badges}>
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tagLabel(tag)}
                  </Badge>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  day: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  age: { marginStart: 'auto' },
  content: { marginTop: 6 },
  expanded: { marginTop: 8 },
});
