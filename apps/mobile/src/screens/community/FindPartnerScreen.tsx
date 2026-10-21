/**
 * VTID-05296 (N-W2 community-hub) — native port of the web Find a Partner
 * screen (`src/pages/community/FindPartner.tsx`, mobile-web branch). One screen
 * with four sub-views switched by a pill: matches | board | posts | members
 * (`?view=`), default `matches`. Each view is a list with its own
 * loading / empty / error states. Members reuses the directory feed.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Avatar } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, CardRow, ListLoading, ListEmpty, ListError } from './components';
import { IntentCard } from './IntentCard';
// FindPartner uses only ports-layer UI (no direct @vitana/ui import).
import { useIntentBoard } from './data/intents';
import { useMyIntents } from './data/intents';
import { useFindPartnerMatches } from './data/findPartner';
import { useMembersDirectory } from './data/directory';

export type FindPartnerView = 'matches' | 'board' | 'posts' | 'members';
const VIEWS: FindPartnerView[] = ['matches', 'board', 'posts', 'members'];

export function FindPartnerScreen({ initialView = 'matches' as FindPartnerView }: { initialView?: FindPartnerView }) {
  const { t } = useI18n();
  const [view, setView] = useState<FindPartnerView>(initialView);

  return (
    <ScreenScaffold title={t('communityHubNative.findPartner.title')} subtitle={t('communityHubNative.findPartner.subtitle')} testID="screen-find-partner">
      <FilterChips
        groupLabel={t('communityHubNative.findPartner.viewLabel')}
        chips={VIEWS.map((v) => ({ key: v, label: t(`communityHubNative.findPartner.view.${v}`) }))}
        selected={view}
        onSelect={(k) => setView(k as FindPartnerView)}
        testID="find-partner-view"
      />
      {view === 'matches' ? <MatchesView /> : null}
      {view === 'board' ? <BoardView /> : null}
      {view === 'posts' ? <PostsView /> : null}
      {view === 'members' ? <MembersView /> : null}
    </ScreenScaffold>
  );
}

function MatchesView() {
  const { t } = useI18n();
  const { data: matches, isLoading, isError, refetch } = useFindPartnerMatches();
  const list = matches ?? [];
  if (isLoading) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (isError) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />;
  if (list.length === 0) return <ListEmpty title={t('communityHubNative.findPartner.emptyMatches')} testID="find-partner-matches-empty" />;
  return (
    <View style={styles.list} testID="find-partner-matches-list">
      {list.map((m) => (
        <CardRow
          key={m.match_id}
          onPress={() => navigateToWebPath(`/intents/match/${m.source_intent_id}`)}
          accessibilityLabel={m.partner_display_name ?? m.partner_intent_title ?? t('communityHubNative.findPartner.matchFallback')}
          testID={`find-partner-match-${m.match_id}`}
        >
          <View style={styles.matchRow}>
            <Avatar uri={m.partner_avatar_url} fallback={(m.partner_display_name ?? '?').slice(0, 1).toUpperCase()} size={44} />
            <View style={styles.fill}>
              <Text weight="600" numberOfLines={1}>
                {m.partner_display_name ?? m.partner_intent_title ?? t('communityHubNative.findPartner.matchFallback')}
              </Text>
              {m.partner_intent_scope ? (
                <Text variant="caption" muted numberOfLines={2}>
                  {m.partner_intent_scope}
                </Text>
              ) : null}
            </View>
            <Text weight="700">{t('communityHubNative.findPartner.scorePercent', { score: Math.round(m.score ?? 0) })}</Text>
          </View>
        </CardRow>
      ))}
    </View>
  );
}

function BoardView() {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useIntentBoard('all');
  const list = data?.intents ?? [];
  if (isLoading) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (isError) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />;
  if (list.length === 0) return <ListEmpty title={t('communityHubNative.intents.emptyBoard')} testID="find-partner-board-empty" />;
  return (
    <View style={styles.list} testID="find-partner-board-list">
      {list.map((i) => (
        <IntentCard key={i.intent_id} intent={i} />
      ))}
    </View>
  );
}

function PostsView() {
  const { t } = useI18n();
  const { data: intents = [], isLoading, isError, refetch } = useMyIntents('all');
  if (isLoading) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (isError) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />;
  if (intents.length === 0) return <ListEmpty title={t('communityHubNative.intents.emptyMine')} testID="find-partner-posts-empty" />;
  return (
    <View style={styles.list} testID="find-partner-posts-list">
      {intents.map((i) => (
        <IntentCard key={i.intent_id} intent={i} onPress={() => navigateToWebPath(`/intents/match/${i.intent_id}`)} />
      ))}
    </View>
  );
}

function MembersView() {
  const { t } = useI18n();
  const { members, loading, error, retry } = useMembersDirectory('newest', null);
  if (loading && members.length === 0) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (error && members.length === 0) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={retry} />;
  if (members.length === 0) return <ListEmpty title={t('communityHubNative.members.empty')} testID="find-partner-members-empty" />;
  return (
    <View style={styles.list} testID="find-partner-members-list">
      {members.map((m) => (
        <CardRow
          key={m.vitana_id ?? `${m.registration_seq}`}
          onPress={() => m.vitana_id && navigateToWebPath(`/profile/${m.vitana_id}`)}
          accessibilityLabel={m.display_name ?? t('communityHubNative.members.fallbackName')}
          testID={`find-partner-member-${m.vitana_id ?? m.registration_seq}`}
        >
          <View style={styles.matchRow}>
            <Avatar uri={m.avatar_url} fallback={(m.display_name ?? '?').slice(0, 1).toUpperCase()} size={44} />
            <View style={styles.fill}>
              <Text weight="600" numberOfLines={1}>
                {m.display_name ?? t('communityHubNative.members.fallbackName')}
              </Text>
              {m.location ? (
                <Text variant="caption" muted numberOfLines={1}>
                  {m.location}
                </Text>
              ) : null}
            </View>
          </View>
        </CardRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  fill: { flex: 1 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
});
