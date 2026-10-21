/**
 * VTID-05296 (N-W2 community-hub) — native port of the web community intent
 * board (`src/pages/IntentBoard.tsx`, mobile-web branch). Kind filter chips
 * (the `dance` meta-tab is client-filtered by `dance.` category prefix), a
 * list of intent cards, and loading / empty / error states.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, ListLoading, ListEmpty, ListError } from './components';
import { IntentCard } from './IntentCard';
import { useIntentBoard, type IntentKind } from './data/intents';

type Filter = IntentKind | 'all' | 'dance';
const KIND_FILTERS: Filter[] = [
  'all',
  'dance',
  'activity_seek',
  'commercial_buy',
  'commercial_sell',
  'social_seek',
  'mutual_aid',
];

function filterLabelKey(f: Filter): string {
  if (f === 'all') return 'communityHubNative.intents.filter.all';
  if (f === 'dance') return 'communityHubNative.intents.filter.dance';
  return `communityHubNative.intents.kind.${f}`;
}

export function IntentBoardScreen() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, refetch } = useIntentBoard(filter);

  const intents = useMemo(() => {
    const list = data?.intents ?? [];
    if (filter === 'dance') return list.filter((i) => i.category?.startsWith('dance.'));
    return list;
  }, [data, filter]);

  return (
    <ScreenScaffold title={t('communityHubNative.intents.boardTitle')} subtitle={t('communityHubNative.intents.boardSubtitle')} testID="screen-intent-board">
      <FilterChips
        groupLabel={t('communityHubNative.intents.filtersLabel')}
        chips={KIND_FILTERS.map((f) => ({ key: f, label: t(filterLabelKey(f)) }))}
        selected={filter}
        onSelect={(k) => setFilter(k as Filter)}
        testID="intent-board-filter"
      />
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
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  footer: { alignItems: 'center', paddingTop: 8 },
});
