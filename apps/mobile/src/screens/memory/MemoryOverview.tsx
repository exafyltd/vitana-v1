/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — `/memory`
 * (MEMORY.OVERVIEW), body-port of the web `src/pages/Memory.tsx` phone layout
 * (plan decision 6): the memory sub-navigation, the 🧠 Memory Hub header, the
 * Add Memory action and the Categories / Timeline / Education split bar
 * (`?tab=` like the web `useUrlTab`). Categories leads with this week's
 * Vitana Index and the routines Vitana noticed, then what Vitana knows and
 * the Memory Garden. The web utility row's search box (no handler on the
 * phone layout) and calendar button (the calendar lane's popup) are not part
 * of this body port.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../../ports/ui';
import { ChipRow, MemoryScaffold } from './components';
import { useMemoryText } from './text';
import { IndexWeekStory, RoutinesCard, WhatVitanaKnows } from './overview/cards';
import { MemoryGarden } from './overview/Garden';
import { AddMemorySheet } from './overview/AddMemorySheet';
import { MemoryTimelineTab } from './overview/TimelineTab';
import { MemoryEducationTab } from './overview/EducationTab';

const TABS = ['categories', 'timeline', 'education'] as const;
type Tab = (typeof TABS)[number];

export function MemoryOverview() {
  const { t } = useMemoryText();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initial = (TABS as readonly string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'categories';
  const [tab, setTab] = useState<Tab>(initial);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <MemoryScaffold
      active="overview"
      title={t('screens.memory.memoryHub')}
      description={t('memoryLearning.header.overviewDescription')}
      emoji="🧠"
      testID="screen-memory-overview"
      actions={
        <Button size="sm" onPress={() => setAddOpen(true)} testID="memory-add-open">
          {t('screens.memory.addMemory')}
        </Button>
      }
    >
      <ChipRow
        label={t('screens.memory.memoryHub')}
        chips={TABS.map((v) => ({ key: v, label: t(`screens.memory.${v}`) }))}
        isActive={(k) => k === tab}
        onPress={(k) => setTab(k as Tab)}
        testID="memory-tab"
      />
      {tab === 'categories' ? (
        <View style={styles.pane} testID="memory-overview">
          <IndexWeekStory />
          <RoutinesCard />
          <WhatVitanaKnows />
          <MemoryGarden />
        </View>
      ) : tab === 'timeline' ? (
        <MemoryTimelineTab />
      ) : (
        <MemoryEducationTab />
      )}
      <AddMemorySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </MemoryScaffold>
  );
}

const styles = StyleSheet.create({
  pane: { gap: 16 },
});
