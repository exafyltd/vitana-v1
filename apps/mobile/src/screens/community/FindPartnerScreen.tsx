/**
 * VTID-05296 (N-W2 community-hub) — native port of the web Find a Partner
 * screen (`src/pages/community/FindPartner.tsx`, mobile-web branch). One screen
 * with four sub-views switched by a pill: matches | board | posts | members
 * (`?view=`), default `matches`. A shared free-text search box filters every
 * view's list (web "Search posts & matches"); a filter sheet narrows the
 * matches by a minimum score; a composer posts a new wish. The board is scoped
 * to dance+fitness, matching the web `surface=find_a_partner` board. Each view
 * keeps its own loading / empty / error states. Members reuses the directory.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Avatar, TextInput } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, FilterChips, CardRow, ListLoading, ListEmpty, ListError } from './components';
import { IntentCard } from './IntentCard';
import { IntentComposer } from './IntentComposer';
import {
  FindPartnerFilterSheet,
  DEFAULT_FIND_PARTNER_FILTERS,
  countActiveFindPartnerFilters,
  type FindPartnerFilters,
} from './FindPartnerFilterSheet';
// FindPartner uses only ports-layer UI (no direct @vitana/ui import).
import { useIntentBoard } from './data/intents';
import { useMyIntents } from './data/intents';
import { useFindPartnerMatches, type FindPartnerMatch } from './data/findPartner';
import { useMembersDirectory, type MemberRow } from './data/directory';
import type { UserIntent } from './data/intents';

export type FindPartnerView = 'matches' | 'board' | 'posts' | 'members';
const VIEWS: FindPartnerView[] = ['matches', 'board', 'posts', 'members'];

// Board scoping (web `categories: ['dance.*', 'fitness.*']`).
const PARTNER_PREFIXES = ['dance.', 'fitness.'];
function inPartnerScope(category: string | null): boolean {
  return !category || PARTNER_PREFIXES.some((p) => category.startsWith(p));
}

function intentHit(it: UserIntent, q: string): boolean {
  if (!q) return true;
  return [it.title, it.scope, it.category, it.requester_vitana_id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export function FindPartnerScreen({ initialView = 'matches' as FindPartnerView }: { initialView?: FindPartnerView }) {
  const { t } = useI18n();
  const [view, setView] = useState<FindPartnerView>(initialView);
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FindPartnerFilters>(DEFAULT_FIND_PARTNER_FILTERS);

  const q = search.trim().toLowerCase();
  const activeFilterCount = countActiveFindPartnerFilters(filters);

  return (
    <ScreenScaffold
      title={t('communityHubNative.findPartner.title')}
      subtitle={t('communityHubNative.findPartner.subtitle')}
      action={
        <Button size="sm" onPress={() => setComposerOpen(true)} testID="find-partner-new-wish">
          {t('communityHubNative.findPartner.newWish')}
        </Button>
      }
      testID="screen-find-partner"
    >
      <View style={styles.searchRow}>
        <View style={styles.fill}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('communityHubNative.findPartner.searchPlaceholder')}
            accessibilityLabel={t('communityHubNative.findPartner.searchLabel')}
            testID="find-partner-search"
          />
        </View>
        {view === 'matches' ? (
          <Button
            variant={activeFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            onPress={() => setFilterOpen(true)}
            testID="find-partner-filter-open"
          >
            {activeFilterCount > 0
              ? t('communityHubNative.findPartner.filterActive', { count: activeFilterCount })
              : t('communityHubNative.findPartner.filter')}
          </Button>
        ) : null}
      </View>

      <FilterChips
        groupLabel={t('communityHubNative.findPartner.viewLabel')}
        chips={VIEWS.map((v) => ({ key: v, label: t(`communityHubNative.findPartner.view.${v}`) }))}
        selected={view}
        onSelect={(k) => setView(k as FindPartnerView)}
        testID="find-partner-view"
      />
      {view === 'matches' ? <MatchesView query={q} filters={filters} onFilterChange={setFilters} filterOpen={filterOpen} onCloseFilter={() => setFilterOpen(false)} /> : null}
      {view === 'board' ? <BoardView query={q} /> : null}
      {view === 'posts' ? <PostsView query={q} /> : null}
      {view === 'members' ? <MembersView query={q} /> : null}

      <IntentComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </ScreenScaffold>
  );
}

function matchHit(m: FindPartnerMatch, q: string): boolean {
  if (!q) return true;
  return [m.partner_display_name, m.partner_intent_title, m.partner_intent_scope]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function applyMatchFilters(list: FindPartnerMatch[], filters: FindPartnerFilters, q: string): FindPartnerMatch[] {
  return list.filter((m) => (m.score ?? 0) >= filters.minScore && matchHit(m, q));
}

function MatchesView({
  query,
  filters,
  onFilterChange,
  filterOpen,
  onCloseFilter,
}: {
  query: string;
  filters: FindPartnerFilters;
  onFilterChange: (f: FindPartnerFilters) => void;
  filterOpen: boolean;
  onCloseFilter: () => void;
}) {
  const { t } = useI18n();
  const { data: matches, isLoading, isError, refetch } = useFindPartnerMatches();
  const all = useMemo(() => matches ?? [], [matches]);
  const list = useMemo(() => applyMatchFilters(all, filters, query), [all, filters, query]);
  const narrowed = list.length < all.length;

  return (
    <>
      {isLoading ? (
        <ListLoading label={t('communityHubNative.common.loading')} />
      ) : isError ? (
        <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        all.length > 0 ? (
          <ListEmpty title={t('communityHubNative.findPartner.noMatchesForFilters')} testID="find-partner-matches-empty" />
        ) : (
          <ListEmpty title={t('communityHubNative.findPartner.emptyMatches')} testID="find-partner-matches-empty" />
        )
      ) : (
        <>
          {narrowed ? (
            <Text variant="caption" muted testID="find-partner-matches-narrowed">
              {t('communityHubNative.findPartner.showingOfTotal', { shown: list.length, total: all.length })}
            </Text>
          ) : null}
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
        </>
      )}

      <FindPartnerFilterSheet
        open={filterOpen}
        onClose={onCloseFilter}
        filters={filters}
        onApply={onFilterChange}
        resultCount={(draft) => applyMatchFilters(all, draft, query).length}
        labels={{
          title: t('communityHubNative.findPartner.filterTitle'),
          minScore: t('communityHubNative.findPartner.filterMinScore'),
          minScoreValue: (score) => t('communityHubNative.findPartner.scorePercent', { score }),
          clear: t('communityHubNative.findPartner.filterClear'),
          apply: (count) => t('communityHubNative.findPartner.filterShowResults', { count }),
        }}
      />
    </>
  );
}

function BoardView({ query }: { query: string }) {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useIntentBoard('all');
  const list = useMemo(
    () => (data?.intents ?? []).filter((i) => inPartnerScope(i.category) && intentHit(i, query)),
    [data, query],
  );
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

function PostsView({ query }: { query: string }) {
  const { t } = useI18n();
  const { data: intents = [], isLoading, isError, refetch } = useMyIntents('all');
  const list = useMemo(() => intents.filter((i) => intentHit(i, query)), [intents, query]);
  if (isLoading) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (isError) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void refetch()} />;
  if (list.length === 0) return <ListEmpty title={t('communityHubNative.intents.emptyMine')} testID="find-partner-posts-empty" />;
  return (
    <View style={styles.list} testID="find-partner-posts-list">
      {list.map((i) => (
        <IntentCard key={i.intent_id} intent={i} onPress={() => navigateToWebPath(`/intents/match/${i.intent_id}`)} />
      ))}
    </View>
  );
}

function memberHit(m: MemberRow, q: string): boolean {
  if (!q) return true;
  return [m.display_name, m.vitana_id, m.location].filter(Boolean).join(' ').toLowerCase().includes(q);
}

function MembersView({ query }: { query: string }) {
  const { t } = useI18n();
  const { members, loading, error, retry } = useMembersDirectory('newest', null);
  const list = useMemo(() => members.filter((m) => memberHit(m, query)), [members, query]);
  if (loading && members.length === 0) return <ListLoading label={t('communityHubNative.common.loading')} />;
  if (error && members.length === 0) return <ListError message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={retry} />;
  if (list.length === 0) return <ListEmpty title={t('communityHubNative.members.empty')} testID="find-partner-members-empty" />;
  return (
    <View style={styles.list} testID="find-partner-members-list">
      {list.map((m) => (
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
});
