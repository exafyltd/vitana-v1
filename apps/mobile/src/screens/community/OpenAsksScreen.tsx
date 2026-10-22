/**
 * VTID-05296 (N-W2 community-hub) — native port of the web Open Asks feed
 * (`src/pages/community/OpenAsks.tsx`, mobile-web branch). Kind + topic filter
 * chips, a cursor "load more" pager, and a tappable card per ask that opens the
 * post. 1:1 parity with the phone web screen.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Text, Icon } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, CardRow, ListLoading, ListEmpty, ListError, LoadMore } from './components';
import { useOpenAsks, type AskRow } from './data/directory';

const KIND_FILTERS = [
  'all',
  'learning_seek',
  'mentor_seek',
  'activity_seek',
  'commercial_buy',
  'commercial_sell',
  'social_seek',
  'mutual_aid',
] as const;

const TOPIC_KEYS = ['everything', 'dance'] as const;

function kindLabelKey(kind: string): string {
  const known: Record<string, string> = {
    commercial_buy: 'communityHubNative.openAsks.kind.commercial_buy',
    commercial_sell: 'communityHubNative.openAsks.kind.commercial_sell',
    activity_seek: 'communityHubNative.openAsks.kind.activity_seek',
    partner_seek: 'communityHubNative.openAsks.kind.partner_seek',
    social_seek: 'communityHubNative.openAsks.kind.social_seek',
    mutual_aid: 'communityHubNative.openAsks.kind.mutual_aid',
    learning_seek: 'communityHubNative.openAsks.kind.learning_seek',
    mentor_seek: 'communityHubNative.openAsks.kind.mentor_seek',
  };
  return known[kind] ?? '';
}

function relativeKey(iso: string): { key: string; n: number } {
  const ts = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - ts) / 1000;
  if (diff < 60) return { key: 'communityHubNative.openAsks.time.justNow', n: 0 };
  if (diff < 3600) return { key: 'communityHubNative.openAsks.time.minutes', n: Math.floor(diff / 60) };
  if (diff < 86400) return { key: 'communityHubNative.openAsks.time.hours', n: Math.floor(diff / 3600) };
  return { key: 'communityHubNative.openAsks.time.days', n: Math.floor(diff / 86400) };
}

export function OpenAsksScreen() {
  const { t } = useI18n();
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [topic, setTopic] = useState<string>('everything');

  const danceOnly = topic === 'dance';
  const kind = kindFilter === 'all' ? null : kindFilter;
  const { asks, loading, error, hasMore, loadMore, retry } = useOpenAsks(kind, danceOnly);

  const summary = loading && asks.length === 0
    ? t('communityHubNative.openAsks.summaryLoading')
    : asks.length === 0
      ? t('communityHubNative.openAsks.summaryEmpty')
      : t('communityHubNative.openAsks.summaryCount', { n: asks.length });

  return (
    <ScreenScaffold title={t('communityHubNative.openAsks.title')} subtitle={summary} testID="screen-open-asks">
      <FilterChips
        groupLabel={t('communityHubNative.openAsks.kindLabel')}
        chips={KIND_FILTERS.map((k) => ({
          key: k,
          label: k === 'all' ? t('communityHubNative.openAsks.filterAll') : t(kindLabelKey(k)),
        }))}
        selected={kindFilter}
        onSelect={setKindFilter}
        testID="open-asks-kind"
      />
      <FilterChips
        groupLabel={t('communityHubNative.openAsks.topicLabel')}
        chips={TOPIC_KEYS.map((k) => ({ key: k, label: t(`communityHubNative.openAsks.topic.${k}`) }))}
        selected={topic}
        onSelect={setTopic}
        testID="open-asks-topic"
      />

      {loading && asks.length === 0 ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : error && asks.length === 0 ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={retry} />
      ) : asks.length === 0 ? (
        <ListEmpty
          title={danceOnly ? t('communityHubNative.openAsks.emptyDance') : t('communityHubNative.openAsks.emptyFilter')}
          testID="open-asks-empty"
        />
      ) : (
        <View style={styles.list} testID="open-asks-list">
          {asks.map((a) => (
            <AskCard key={a.intent_id} ask={a} />
          ))}
        </View>
      )}

      {hasMore && asks.length > 0 ? (
        <LoadMore label={t('communityHubNative.common.loadMore')} loading={loading} onPress={loadMore} />
      ) : null}
    </ScreenScaffold>
  );
}

function AskCard({ ask }: { ask: AskRow }) {
  const { t } = useI18n();
  const rel = relativeKey(ask.created_at);
  const kindKey = kindLabelKey(ask.intent_kind);
  return (
    <CardRow
      onPress={() => navigateToWebPath(`/p/${ask.intent_id}`)}
      accessibilityLabel={ask.title}
      testID={`ask-card-${ask.intent_id}`}
    >
      <View style={styles.askHeader}>
        <Badge variant="secondary">{kindKey ? t(kindKey) : ask.intent_kind}</Badge>
        <Text variant="caption" muted>
          {rel.n === 0 ? t(rel.key) : t(rel.key, { n: rel.n })}
        </Text>
      </View>
      <Text weight="600" style={styles.askTitle}>
        {ask.title}
      </Text>
      <Text muted numberOfLines={2} style={styles.askScope}>
        {ask.scope_excerpt}
      </Text>
      <View style={styles.metaRow}>
        {ask.requester_vitana_id ? (
          <Text variant="caption" muted>
            {t('communityHubNative.openAsks.handle', { handle: ask.requester_vitana_id })}
          </Text>
        ) : null}
        {ask.category ? (
          <Text variant="caption" muted>
            {ask.category.replace(/_/g, ' ')}
          </Text>
        ) : null}
      </View>
    </CardRow>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  askHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', gap: 8 },
  askTitle: { marginTop: 8 },
  askScope: { marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
});
