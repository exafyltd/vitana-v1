/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — `/memory/recall`
 * (MEMORY.RECALL), body-port of the web `src/pages/memory/Recall.tsx`: the 🤖
 * AI Memory Recall header, the Memory Actions button (the web
 * `RecallMasterActionPopup`, as a bottom sheet), the AI Memory Search panel
 * and the Search results / AI insights / Quick recall split bar. No live
 * read: the web phone tabs show sample cards only (made-up results, stock
 * photos), so each tab shows the honest empty state the web Spotlight frame
 * shows instead (`SpotlightEmpty`, VTID-05117 SR-24): "Just ask Vitana" and a
 * way back to Memory.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, PressableRow, Text, TextInput, useUITheme } from '../../ports/ui';
import { MemoryIcon } from '../../ports/memory';
import { navigateToWebPath } from '../../navigation/navigate';
import { ChipRow, MemoryCard, MemoryScaffold } from './components';
import { useMemoryText } from './text';

const TABS = ['searchResults', 'aiInsights', 'quickRecall'] as const;
type Tab = (typeof TABS)[number];

/** The web RecallMasterActionPopup actions; only "Search by date" navigates there, the rest close the popup. */
const RECALL_ACTIONS: ReadonlyArray<{ key: string; icon: string; path?: string }> = [
  { key: 'askAiQuestion', icon: 'MessageCircle' },
  { key: 'advancedSearch', icon: 'Search' },
  { key: 'patternAnalysis', icon: 'TrendingUp' },
  { key: 'memoryInsights', icon: 'Brain' },
  { key: 'searchByDate', icon: 'Calendar', path: '/memory/timeline' },
  { key: 'locationMemories', icon: 'MapPin' },
  { key: 'filterByCategory', icon: 'Filter' },
  { key: 'quickRecalls', icon: 'Zap' },
];

export function MemoryRecall() {
  const { t } = useMemoryText();
  const { colors } = useUITheme();
  const [tab, setTab] = useState<Tab>('searchResults');
  const [query, setQuery] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <MemoryScaffold
      active="recall"
      title={t('screens.memory.aiMemoryRecall')}
      description={t('spotlightMember.memory.recall.desc')}
      emoji="🤖"
      testID="screen-memory-recall"
      actions={
        <Button size="sm" onPress={() => setActionsOpen(true)} testID="recall-actions-open">
          {t('screens.memory.memoryActions')}
        </Button>
      }
    >
      <MemoryCard eyebrow={t('screens.memory.aiMemorySearch')} eyebrowIcon="Search" testID="recall-search-panel">
        <View style={styles.searchRow}>
          <View style={styles.fill}>
            <TextInput value={query} onChangeText={setQuery} placeholder={t('screens.memory.askAiWhatHelpedImproveMy')} accessibilityLabel={t('screens.memory.aiMemorySearch')} testID="recall-search-input" />
          </View>
        </View>
        <Button testID="recall-search-button">{t('screens.memory.searchMemories')}</Button>
      </MemoryCard>

      <ChipRow label={t('screens.memory.aiMemoryRecall')} chips={TABS.map((k) => ({ key: k, label: t(`screens.memory.${k}`) }))} isActive={(k) => k === tab} onPress={(k) => setTab(k as Tab)} testID="recall-tab" />

      <View style={[styles.empty, { borderColor: colors.border }]} testID={`recall-empty-${tab}`}>
        <MemoryIcon name="Brain" size={32} color={colors.mutedForeground} />
        <Text weight="600" accessibilityRole="header" style={styles.center}>
          {t('spotlightMember.memory.recall.emptyTitle')}
        </Text>
        <Text muted style={styles.center}>
          {t('spotlightMember.memory.recall.emptyDesc')}
        </Text>
        <Button variant="outline" size="sm" onPress={() => navigateToWebPath('/memory')} testID="recall-empty-action">
          {t('spotlightMember.memory.recall.emptyAction')}
        </Button>
      </View>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={t('recallActions.title')} testID="recall-actions">
        <View style={styles.actions}>
          {RECALL_ACTIONS.map((a) => (
            <PressableRow
              key={a.key}
              onPress={() => {
                setActionsOpen(false);
                if (a.path) navigateToWebPath(a.path);
              }}
              accessibilityLabel={t(`recallActions.items.${a.key}.title`)}
              testID={`recall-action-${a.key}`}
              style={[styles.action, { borderColor: colors.border }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.muted }]}>
                <MemoryIcon name={a.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.fill}>
                <Text weight="600">{t(`recallActions.items.${a.key}.title`)}</Text>
                <Text variant="caption" muted>
                  {t(`recallActions.items.${a.key}.description`)}
                </Text>
              </View>
            </PressableRow>
          ))}
          <Button variant="outline" onPress={() => setActionsOpen(false)} testID="recall-actions-close">
            {t('buttons.close')}
          </Button>
        </View>
      </BottomSheet>
    </MemoryScaffold>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 8 },
  fill: { flex: 1 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 24, gap: 12, alignItems: 'center' },
  center: { textAlign: 'center' },
  actions: { gap: 10 },
  action: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'flex-start' },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
