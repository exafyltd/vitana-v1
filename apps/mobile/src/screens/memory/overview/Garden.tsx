/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the Memory Garden,
 * native twin of the web `MemoryCategoryGrid.tsx` + `MemoryCategoryCard.tsx`
 * (13 category cards with a progress ring, count and last update; counts are
 * "loading" / "couldn't load", never zero, without data — VTID-04501),
 * `CategoryDetailDialog.tsx` (the category's memories with edit / delete and,
 * for Uncategorized, quick categorize) and `EditMemoryDialog.tsx`, the
 * dialogs as bottom sheets. The web detail's subcategory badges are not
 * ported: they filter on tags the garden API never returns (every entry is
 * tagged `[category, source]`, `useKnowledgeBase.entryToKnowledgeItem`), so
 * they always read 0 and are untranslated English on the web.
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Badge, BottomSheet, Button, PressableRow, Text, notify, useUITheme } from '../../../ports/ui';
import { MemoryIcon, Textarea } from '../../../ports/memory';
import { ChipRow } from '../components';
import { GARDEN_CATEGORIES, gardenCategoryKey, useKnowledgeBase, useMemoryMetadata, type KnowledgeItem } from '../data/garden';
import { useMemoryText } from '../text';
import { AddMemorySheet } from './AddMemorySheet';

const QUICK_CATEGORIES = GARDEN_CATEGORIES.filter((c) => c.id !== 'general');

/** A category id or source tag in the member's language. */
export function useTagLabel() {
  const { t } = useMemoryText();
  return (tag: string) => {
    if (tag === 'ai') return t('screens.memory.aiInsight');
    if (tag === 'diary') return t('screens.memory.diaryEntry');
    const key = `screens.memory.garden.categories.${gardenCategoryKey(tag)}.title`;
    const s = t(key);
    return s === key ? tag : s;
  };
}

function ProgressRing({ progress, loading, icon }: { progress: number; loading: boolean; icon: string }) {
  const { colors } = useUITheme();
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = loading ? c : c - (progress / 100) * c;
  return (
    <View style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={80} height={80} style={styles.ringSvg}>
        <Circle cx={40} cy={40} r={r} stroke={colors.muted} strokeWidth={6} fill="none" opacity={0.6} />
        <Circle cx={40} cy={40} r={r} stroke={colors.primary} strokeWidth={6} fill="none" strokeDasharray={`${c}`} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <View style={styles.ringIcon}>
        <MemoryIcon name={icon} size={24} />
      </View>
    </View>
  );
}

export function MemoryGarden() {
  const x = useMemoryText();
  const { t } = x;
  const { colors } = useUITheme();
  const { metadata, isLoading, isError, refreshMetadata, isRefreshing } = useMemoryMetadata();
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const countsUnknown = isLoading || (isError && !metadata);

  const refresh = async () => {
    await refreshMetadata();
    notify('toasts.memory.memoryGardenUpdated');
  };

  return (
    <View style={styles.garden} testID="memory-garden">
      <View style={styles.gardenHeader}>
        <View style={styles.fill}>
          <Text variant="title" accessibilityRole="header">
            {t('screens.memory.memoryGarden')}
          </Text>
          <Text muted testID="memory-garden-summary">
            {isLoading
              ? t('screens.memory.garden.loading')
              : countsUnknown
                ? t('screens.memory.garden.loadFailed')
                : t('screens.memory.value0TotalMemoriesAcrossAllCategories', { value0: metadata?.total_memories_count || 0 })}
          </Text>
        </View>
        <Button variant="outline" size="sm" onPress={() => void refresh()} disabled={isRefreshing} testID="memory-garden-refresh">
          {t('screens.memory.refreshProgress')}
        </Button>
      </View>

      {GARDEN_CATEGORIES.map((cat) => {
        const progress = metadata?.category_progress[cat.id] ?? null;
        const count = progress?.memoryCount || 0;
        const pct = progress?.progress || 0;
        const key = gardenCategoryKey(cat.id);
        const title = t(`screens.memory.garden.categories.${key}.title`);
        const insight = progress?.lastUpdated
          ? t('screens.memory.garden.lastUpdated', { date: x.fmtDate(progress.lastUpdated) })
          : t(`screens.memory.garden.categories.${key}.insight`);
        const countText = countsUnknown
          ? t(!isLoading ? 'screens.memory.garden.loadFailed' : 'screens.memory.garden.loading')
          : count === 1
            ? t('screens.memory.garden.cardCountOne', { progress: pct })
            : t('screens.memory.garden.cardCountOther', { count, progress: pct });
        return (
          <PressableRow
            key={cat.id}
            onPress={() => {
              setSelected(cat.id);
              setDetailOpen(true);
            }}
            accessibilityLabel={`${title}, ${countText}`}
            accessibilityState={{ disabled: false }}
            testID={`memory-category-${cat.id}`}
            style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ProgressRing progress={pct} loading={countsUnknown} icon={cat.icon} />
            <View style={styles.fill}>
              <Text weight="600" numberOfLines={1}>
                {title}
              </Text>
              <Text variant="caption" muted testID={`memory-category-count-${cat.id}`}>
                {countText}
              </Text>
              <Text muted numberOfLines={2}>
                {insight}
              </Text>
            </View>
          </PressableRow>
        );
      })}

      {selected ? (
        <CategoryDetailSheet
          open={detailOpen}
          categoryId={selected}
          onClose={() => setDetailOpen(false)}
          onAddMemory={() => {
            setDetailOpen(false);
            setAddOpen(true);
          }}
        />
      ) : null}
      <AddMemorySheet open={addOpen} onClose={() => setAddOpen(false)} defaultCategory={selected ?? undefined} />
    </View>
  );
}

function CategoryDetailSheet({ open, categoryId, onClose, onAddMemory }: { open: boolean; categoryId: string; onClose: () => void; onAddMemory: () => void }) {
  const x = useMemoryText();
  const { t } = x;
  const tagLabel = useTagLabel();
  const { colors } = useUITheme();
  const { knowledgeItems, deleteKnowledge, updateKnowledge, isLoading } = useKnowledgeBase();
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const memories = knowledgeItems.filter((i) => i.tags.includes(categoryId) || i.memoryType === categoryId);
  const title = t(`screens.memory.garden.categories.${gardenCategoryKey(categoryId)}.title`);

  return (
    <>
      <BottomSheet open={open && !editing} onClose={onClose} title={title} testID="memory-category-detail">
        <View style={styles.detailHeader}>
          <Text muted style={styles.fill}>
            {memories.length === 1 ? t('screens.memory.garden.countOne') : t('screens.memory.garden.countOther', { count: memories.length })}
          </Text>
          <Button size="sm" onPress={onAddMemory} testID="memory-category-add">
            {t('screens.memory.addMemory')}
          </Button>
        </View>
        {isLoading ? (
          <Text muted style={styles.center}>
            {t('screens.memory.loadingMemories')}
          </Text>
        ) : memories.length === 0 ? (
          <View style={styles.centerBox} testID="memory-category-empty">
            <Text muted style={styles.center}>
              {t('screens.memory.noMemoriesYetThisCategory')}
            </Text>
            <Text variant="caption" muted style={styles.center}>
              {t('screens.memory.clickAddMemoryGetStarted')}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.memoryScroll} contentContainerStyle={styles.memoryList}>
            {memories.map((m) => (
              <View key={m.id} testID="memory-item" style={[styles.memoryCard, { borderColor: colors.border }]}>
                <View style={styles.memoryRow}>
                  <View style={styles.fill}>
                    <Text>{m.content}</Text>
                    <View style={styles.badges}>
                      {m.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tagLabel(tag)}
                        </Badge>
                      ))}
                    </View>
                    {categoryId === 'general' ? (
                      <View style={styles.quick}>
                        <Text variant="caption" muted>
                          {t('screens.memory.quickCategorize')}
                        </Text>
                        <ChipRow
                          label={t('screens.memory.quickCategorize')}
                          chips={QUICK_CATEGORIES.map((c) => ({ key: c.id, label: tagLabel(c.id) }))}
                          isActive={() => false}
                          onPress={(k) => updateKnowledge({ id: m.id, content: m.content, tags: m.tags.filter((tg) => tg !== 'general').concat(k) })}
                          testID={`memory-quick-${m.id}`}
                        />
                      </View>
                    ) : null}
                    <Text variant="caption" muted>
                      {`${x.fmtDate(m.createdAt)} • ${m.source === 'ai' ? t('screens.memory.insight') : t('screens.memory.diaryEntry')}`}
                    </Text>
                  </View>
                  <View style={styles.memoryActions}>
                    <Button size="icon" variant="ghost" accessibilityLabel={t('screens.memory.edit')} onPress={() => setEditing(m)} testID={`memory-edit-${m.id}`}>
                      <MemoryIcon name="Edit2" size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" accessibilityLabel={t('screens.memory.delete')} onPress={() => deleteKnowledge(m.id)} testID={`memory-delete-${m.id}`}>
                      <MemoryIcon name="Trash2" size={14} color={colors.destructive} />
                    </Button>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </BottomSheet>
      <EditMemorySheet memory={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function EditMemorySheet({ memory, onClose }: { memory: KnowledgeItem | null; onClose: () => void }) {
  const { t } = useMemoryText();
  const tagLabel = useTagLabel();
  const { updateKnowledge, isUpdating } = useKnowledgeBase();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  useEffect(() => {
    if (memory) {
      setContent(memory.content);
      setCategory(memory.memoryType);
    }
  }, [memory]);

  const save = () => {
    if (!memory) return;
    updateKnowledge({ id: memory.id, content, memoryType: category, tags: [category, ...memory.tags.filter((tg) => tg === 'ai' || tg === 'diary')] }, { onSuccess: onClose });
  };

  return (
    <BottomSheet open={!!memory} onClose={onClose} title={t('screens.memory.editMemory')} testID="memory-edit-sheet">
      <View style={styles.editBody}>
        <Text variant="label">{t('screens.memory.content')}</Text>
        <Textarea value={content} onChangeText={setContent} placeholder={t('screens.memory.editMemoryContent')} accessibilityLabel={t('screens.memory.content')} rows={6} testID="memory-edit-content" />
        <Text variant="label">{t('screens.memory.category')}</Text>
        <ChipRow label={t('screens.memory.category')} chips={GARDEN_CATEGORIES.map((c) => ({ key: c.id, label: tagLabel(c.id) }))} isActive={(k) => k === category} onPress={setCategory} testID="memory-edit-category" />
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose}>
            {t('screens.memory.cancel')}
          </Button>
          <Button onPress={save} disabled={isUpdating || !content.trim()} testID="memory-edit-save">
            {isUpdating ? t('screens.memory.saving') : t('memoryNative.editMemory.save')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  garden: { gap: 12 },
  gardenHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  categoryCard: { borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'flex-start' },
  ring: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', top: 0, start: 0, transform: [{ rotate: '-90deg' }] },
  ringIcon: { alignItems: 'center', justifyContent: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  center: { textAlign: 'center' },
  centerBox: { paddingVertical: 24, gap: 8 },
  memoryScroll: { maxHeight: 400 },
  memoryList: { gap: 12 },
  memoryCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  memoryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  quick: { marginTop: 8, gap: 6 },
  memoryActions: { flexDirection: 'row', gap: 4 },
  editBody: { gap: 12 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
});
