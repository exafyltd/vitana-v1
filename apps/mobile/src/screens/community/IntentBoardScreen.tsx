/**
 * VTID-05296 (N-W2 community-hub) — native port of the web community intent
 * board (`src/pages/IntentBoard.tsx`, mobile-web branch). A "Post" action that
 * opens the intent composer, kind filter chips (incl. `learning_seek` /
 * `mentor_seek`, matching the web `KIND_FILTERS`), the `dance` meta-tab
 * (client-filtered by the `dance.` category prefix) with its dance-variety
 * chips, a list of intent cards, and loading / empty / error states.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, ListLoading, ListEmpty, ListError } from './components';
import { IntentCard } from './IntentCard';
import { IntentComposer } from './IntentComposer';
import { useIntentBoard, type BoardFilter } from './data/intents';

const KIND_FILTERS: BoardFilter[] = [
  'all',
  'dance',
  'learning_seek',
  'mentor_seek',
  'commercial_buy',
  'commercial_sell',
  'activity_seek',
  'social_seek',
  'mutual_aid',
];

// Web `DANCE_VARIETY_CHIPS`; `any` is the no-variety option.
const DANCE_VARIETIES = ['any', 'salsa', 'tango', 'bachata', 'kizomba', 'swing', 'ballroom', 'hiphop'] as const;

function filterLabelKey(f: BoardFilter): string {
  if (f === 'all') return 'communityHubNative.intents.filter.all';
  if (f === 'dance') return 'communityHubNative.intents.filter.dance';
  return `communityHubNative.intents.kind.${f}`;
}

export function IntentBoardScreen() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [danceVariety, setDanceVariety] = useState<string>('any');
  const [composerOpen, setComposerOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useIntentBoard(filter);

  const intents = useMemo(() => {
    const list = data?.intents ?? [];
    if (filter !== 'dance') return list;
    return list.filter((i) => {
      if (!i.category?.startsWith('dance.')) return false;
      if (danceVariety === 'any') return true;
      const payloadVariety = (i.kind_payload as { dance?: { variety?: string } } | null)?.dance?.variety;
      return payloadVariety === danceVariety || i.category.includes(`.${danceVariety}`);
    });
  }, [data, filter, danceVariety]);

  return (
    <ScreenScaffold
      title={t('communityHubNative.intents.boardTitle')}
      subtitle={t('communityHubNative.intents.boardSubtitle')}
      action={
        <Button size="sm" onPress={() => setComposerOpen(true)} testID="intent-board-post">
          {t('communityHubNative.intents.post')}
        </Button>
      }
      testID="screen-intent-board"
    >
      <FilterChips
        groupLabel={t('communityHubNative.intents.filtersLabel')}
        chips={KIND_FILTERS.map((f) => ({ key: f, label: t(filterLabelKey(f)) }))}
        selected={filter}
        onSelect={(k) => setFilter(k as BoardFilter)}
        testID="intent-board-filter"
      />
      {filter === 'dance' ? (
        <View style={styles.varietyRow}>
          <Text variant="label" muted>
            {t('communityHubNative.intents.styleLabel')}
          </Text>
          <FilterChips
            groupLabel={t('communityHubNative.intents.styleLabel')}
            chips={DANCE_VARIETIES.map((v) => ({ key: v, label: t(`communityHubNative.intents.variety.${v}`) }))}
            selected={danceVariety}
            onSelect={setDanceVariety}
            testID="intent-board-variety"
          />
        </View>
      ) : null}
      {isLoading ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : isError ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />
      ) : intents.length === 0 ? (
        <ListEmpty
          title={filter === 'dance' ? t('communityHubNative.intents.emptyDance') : t('communityHubNative.intents.emptyBoard')}
          testID="intent-board-empty"
        />
      ) : (
        <View style={styles.list} testID="intent-board-list">
          {intents.map((i) => (
            <IntentCard key={i.intent_id} intent={i} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <Text variant="caption" muted onPress={() => navigateToWebPath('/intents/mine')} testID="intent-board-mine-link">
          {t('communityHubNative.intents.viewMine')}
        </Text>
      </View>

      <IntentComposer open={composerOpen} onClose={() => setComposerOpen(false)} onPosted={() => void refetch()} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  varietyRow: { gap: 8 },
  footer: { alignItems: 'center', paddingTop: 8 },
});
