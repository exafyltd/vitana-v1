/**
 * E6 — Find a Match: unified dance + fitness destination.
 *
 * Single page with four sub-views switched via a pill-dropdown next to the
 * search box (mobile) or a SplitBar (desktop). Sub-view selected via
 * ?view= query param: matches | board | posts | members. Defaults to matches.
 *
 * - My Matches      → all matches for the user's open dance.* + fitness.*
 *                     intents, sorted by score.
 * - Community Board → public board, scoped to dance.* + fitness.*, with
 *                     surface=find_a_partner so partner_seek is unredacted.
 * - My Posts        → ALL of the user's open intents (any category). On
 *                     mobile this page is also the destination for the
 *                     `/intents/mine` redirect, so it has to surface
 *                     posts the user made via the generic "+ New wish"
 *                     composer — which doesn't always tag dance/fitness.
 * - Members         → community members directory (visible only while
 *                     total ≤ 1000; otherwise hidden).
 *
 * Tap any member card → existing /profile/:vitana_id (Public Profile).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SEO from '@/components/SEO';
import StandardHeader from '@/components/StandardHeader';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import { communityNavigation } from '@/config/navigation';
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { SplitBar, SplitBarList, SplitBarTrigger } from '@/components/ui/split-bar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayAvatarUrl } from '@/lib/autoAvatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Users, Heart, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { IntentCard } from '@/components/intents/IntentCard';
import { FindPartnerMatchCard } from '@/components/intents/FindPartnerMatchCard';
import { FindMatchFilterSheet } from '@/components/intents/FindMatchFilterSheet';
import { IntentComposer } from '@/components/intents/IntentComposer';
import {
  DEFAULT_FILTERS,
  applyFindMatchFilters,
  countActiveFilters,
  matchTextHit,
  type FindMatchFilters,
} from '@/lib/findMatchFilters';
import {
  listMyIntents,
  getIntentBoard,
  getFindPartnerMatches,
  getCommunityMemberCount,
  getCommunityMembers,
  type CommunityMember,
  type FindPartnerMatch,
  type UserIntent,
} from '@/lib/intentApi';
import { t } from '@/lib/i18n-toast';

const MEMBERS_TAB_THRESHOLD = 1000;

// Locally-tracked "opened" profiles, so "Hide already viewed profiles"
// works even before a match transitions state server-side. Stores match
// ids + counterparty vitana ids the user has tapped through to.
const VIEWED_STORAGE_KEY = 'vitana.findMatch.viewed';

function loadViewedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

type View = 'matches' | 'board' | 'posts' | 'members';

const VIEW_OPTIONS: { value: View; icon: string; labelKey: string }[] = [
  { value: 'matches', icon: '💃', labelKey: 'screens.community.viewMatches' },
  { value: 'board',   icon: '📣',   labelKey: 'screens.community.viewBoard' },
  { value: 'posts',   icon: '📝',   labelKey: 'screens.community.viewPosts' },
  { value: 'members', icon: '👥',   labelKey: 'screens.community.viewMembers' },
];

function viewMeta(v: View) {
  return VIEW_OPTIONS.find((o) => o.value === v) ?? VIEW_OPTIONS[0];
}

function initialsFor(name: string | null): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

// Per-view stale time. 5 min: matches/board/posts revalidate in background on
// re-mount but render cached data instantly. Tuned long enough that prefetch
// fired on /home or /comm survives a typical navigation pause.
const FIND_PARTNER_STALE_TIME = 5 * 60 * 1000;
const MEMBER_COUNT_STALE_TIME = 10 * 60 * 1000;

export default function FindPartner() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = (searchParams.get('view') as View) || 'matches';
  const [view, setView] = useState<View>(initialView);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FindMatchFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => loadViewedIds());

  const markViewed = useCallback((...ids: (string | null | undefined)[]) => {
    const fresh = ids.filter((x): x is string => !!x);
    if (fresh.length === 0) return;
    setViewedIds((prev) => {
      if (fresh.every((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      try {
        localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* storage full / unavailable — in-memory tracking still works */
      }
      return next;
    });
  }, []);

  // Keep ?view= in URL synced.
  useEffect(() => {
    const current = searchParams.get('view');
    if (current !== view) {
      const next = new URLSearchParams(searchParams);
      next.set('view', view);
      setSearchParams(next, { replace: true });
    }
  }, [view, searchParams, setSearchParams]);

  // Members tab gate — long-lived count (10min) used purely to decide tab visibility.
  const memberCountQuery = useQuery({
    queryKey: ['community-member-count'],
    queryFn: getCommunityMemberCount,
    staleTime: MEMBER_COUNT_STALE_TIME,
  });
  const memberCount = memberCountQuery.data ?? null;
  const showMembersTab = memberCount === null || memberCount <= MEMBERS_TAB_THRESHOLD;

  // Per-view queries. `enabled: view === X` gates the network call, but cache
  // populated by prefetchForPath (prefetch-registry) survives regardless of
  // which view the user lands on — switching tabs reads from cache instantly.
  const matchesQuery = useQuery({
    queryKey: ['find-partner-matches', user?.id ?? 'anon'],
    queryFn: () => getFindPartnerMatches(),
    enabled: view === 'matches' && !!user,
    staleTime: FIND_PARTNER_STALE_TIME,
  });

  // Autopilot fallback. My Matches must never be a dead end: when the user
  // has no matches to show — because they haven't posted a wish yet, or their
  // posts produced none — surface real community members as suggestions so
  // there is always someone to discover. Only fires once the matches query has
  // resolved empty, so it never races the real matches.
  const suggestionsQuery = useQuery({
    queryKey: ['find-partner-suggestions', user?.id ?? 'anon'],
    queryFn: () => getCommunityMembers({ limit: 12, sort: 'newest' }),
    enabled:
      view === 'matches' && !!user && matchesQuery.isSuccess &&
      (matchesQuery.data?.length ?? 0) === 0,
    staleTime: FIND_PARTNER_STALE_TIME,
  });

  const boardQuery = useQuery({
    queryKey: ['intent-board', 'find_a_partner'],
    queryFn: () =>
      getIntentBoard({
        surface: 'find_a_partner',
        categories: ['dance.*', 'fitness.*'],
        limit: 50,
      }),
    enabled: view === 'board' && !!user,
    staleTime: FIND_PARTNER_STALE_TIME,
  });

  const myPostsQuery = useQuery({
    queryKey: ['my-intents', 'open', user?.id ?? 'anon'],
    queryFn: () => listMyIntents({ status: 'open' }),
    enabled: view === 'posts' && !!user,
    staleTime: FIND_PARTNER_STALE_TIME,
  });

  const membersQuery = useQuery({
    queryKey: ['community-members', user?.id ?? 'anon'],
    queryFn: () => getCommunityMembers({ limit: 50, sort: 'newest' }),
    enabled: view === 'members' && !!user && showMembersTab,
    staleTime: FIND_PARTNER_STALE_TIME,
  });

  const allMatches = matchesQuery.data ?? [];
  const allBoardIntents = boardQuery.data?.intents ?? [];
  const allMyPosts = myPostsQuery.data ?? [];
  const allMembers = membersQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];

  // Free-text search is shared across views (the box reads "Search posts
  // & matches"), so wire a light client-side text filter into each list
  // instead of leaving it a no-op.
  const q = searchQuery.trim().toLowerCase();
  const intentHit = useCallback(
    (it: UserIntent) =>
      !q ||
      [it.title, it.scope, it.category, it.requester_vitana_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    [q],
  );
  const boardIntents = useMemo(() => allBoardIntents.filter(intentHit), [allBoardIntents, intentHit]);
  const myPosts = useMemo(() => allMyPosts.filter(intentHit), [allMyPosts, intentHit]);
  const members = useMemo(
    () =>
      !q
        ? allMembers
        : allMembers.filter((m) =>
            [m.display_name, m.vitana_id, m.location]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q),
          ),
    [allMembers, q],
  );

  // My Matches: apply the filter sheet first, then the free-text search.
  // Both are pure/client-side over the loaded list.
  const matches = useMemo(() => {
    const filtered = applyFindMatchFilters(allMatches, filters, viewedIds);
    return searchQuery.trim()
      ? filtered.filter((m) => matchTextHit(m, searchQuery))
      : filtered;
  }, [allMatches, filters, viewedIds, searchQuery]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  // True when matches are being hidden by a filter/search — drives the
  // "Showing X of Y · Reset" affordance so the count change is never silent.
  const matchesNarrowed =
    view === 'matches' && (activeFilterCount > 0 || !!searchQuery.trim()) &&
    matches.length < allMatches.length;

  const resetMatchFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  }, []);

  // Per-view loading + error derived from the active query. Inactive queries
  // sit at isPending=true / isFetching=false (which v5 surfaces as isLoading=false),
  // so this only reflects the view the user is currently looking at.
  const activeQuery =
    view === 'matches' ? matchesQuery :
    view === 'board' ? boardQuery :
    view === 'posts' ? myPostsQuery :
    membersQuery;
  const loading = activeQuery.isLoading;
  const error = activeQuery.error ? ((activeQuery.error as Error).message ?? 'Could not load.') : null;

  // Composer / match-action refresh: invalidate the three mutable views.
  // Members + member-count are unaffected by intent CRUD.
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['find-partner-matches', user?.id ?? 'anon'] });
    queryClient.invalidateQueries({ queryKey: ['intent-board', 'find_a_partner'] });
    queryClient.invalidateQueries({ queryKey: ['my-intents', 'open', user?.id ?? 'anon'] });
  }, [queryClient, user?.id]);

  // Active sub-view metadata for the pill label + sheet header.
  const active = viewMeta(view);
  const filterLabel = `${active.icon} ${t(active.labelKey)}`;

  const visibleViewOptions = useMemo(
    () => VIEW_OPTIONS.filter((o) => o.value !== 'members' || showMembersTab),
    [showMembersTab]
  );

  return (
    <>
      <SEO title={t('screens.community.findMatchVitana')} description="Find a dance or fitness match in the Vitana community." />

      <AppLayout>
        {!isMobile && <SubNavigation items={communityNavigation} />}
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
        <StandardHeader
          title={t('screens.community.findMatch')}
          description={t('screens.community.findMatchDescription')}
        />

        <UtilityActionButton className="min-w-0" compact={isMobile}>
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder={t('screens.community.searchPostsMatches')}
              onSearch={(query) => setSearchQuery(query)}
              onClear={() => setSearchQuery('')}
              // Mobile uses the chip + sheet picker to switch views;
              // desktop has the SplitBar tab bar directly below this
              // utility row, so the chip would be redundant.
              filterLabel={isMobile ? filterLabel : undefined}
              onFilterClick={isMobile ? () => setPickerOpen(true) : undefined}
              // Filter sheet lives inside the expanded search (matches view
              // only) instead of as a standalone utility-bar icon.
              onFilterToggle={view === 'matches' ? () => setFilterOpen(true) : undefined}
              filterActiveCount={activeFilterCount}
            />
            <Button
              onClick={() => setComposerOpen(true)}
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">{t('screens.community.newWish')}</span>
            </Button>
          </div>
        </UtilityActionButton>

        {!isMobile && (
          <SplitBar value={view} onValueChange={(v) => setView(v as View)} className="w-full mt-2">
            <SplitBarList>
              {visibleViewOptions.map((o) => (
                <SplitBarTrigger key={o.value} value={o.value}>
                  {o.icon} {t(o.labelKey)}
                </SplitBarTrigger>
              ))}
            </SplitBarList>
          </SplitBar>
        )}

        <div className="mt-4">
          {loading && (
            <FindPartnerLoadingSkeleton view={view} isMobile={isMobile} />
          )}

          {error && !loading && (
            <div className="text-sm text-destructive py-4">{t('screens.community.couldnTLoadError', { error })}</div>
          )}

          {/* Showing X of Y · Reset — only when a filter/search is hiding matches. */}
          {!loading && !error && matchesNarrowed && (
            <div className="flex items-center justify-between gap-3 mb-3 text-sm text-muted-foreground">
              <span>
                {t('screens.community.filterShowingOfTotal', {
                  shown: matches.length,
                  total: allMatches.length,
                })}
              </span>
              <button
                type="button"
                onClick={resetMatchFilters}
                className="font-medium text-primary hover:underline"
              >
                {t('screens.community.filterReset')}
              </button>
            </div>
          )}

          {/* My Matches */}
          {!loading && !error && view === 'matches' && (
            matches.length === 0 ? (
              allMatches.length > 0 ? (
                <EmptyState
                  icon={<Heart className="h-10 w-10 text-muted-foreground mb-3" />}
                  title={t('screens.community.noMatchesForFilters')}
                  body={t('screens.community.noMatchesForFiltersBody')}
                  cta={{ label: t('screens.community.filterReset'), onClick: resetMatchFilters }}
                />
              ) : (
                <SuggestedMatches
                  members={suggestions}
                  loading={suggestionsQuery.isLoading}
                  onPostWish={() => setComposerOpen(true)}
                  onOpenMember={(vid) => vid && navigate(`/profile/${vid}`)}
                />
              )
            ) : isMobile ? (
              // Bottom padding leaves ~ a card height of clear space so the
              // primary CTA on the last card stays above the fixed mobile
              // bottom nav and the central Orb FAB.
              <div className="space-y-5 pb-32 max-w-md mx-auto">
                {matches.map((m) => (
                  <FindPartnerMatchCard
                    key={m.match_id}
                    match={m}
                    vertical={m.vertical}
                    sourceCategory={m.source_category}
                    perspective="outgoing"
                    onAction={refresh}
                    onView={() => markViewed(m.match_id, m.vitana_id_b, m.vitana_id_a)}
                  />
                ))}
              </div>
            ) : (
              // Desktop: keep the same card design as mobile, laid out in
              // a uniform 3-column grid (responsive down to 1 column on
              // narrow desktops) so every row stays tidy.
              renderDesktopGrid(matches, (m) => (
                <FindPartnerMatchCard
                  key={m.match_id}
                  match={m}
                  vertical={m.vertical}
                  sourceCategory={m.source_category}
                  perspective="outgoing"
                  onAction={refresh}
                  onView={() => markViewed(m.match_id, m.vitana_id_b, m.vitana_id_a)}
                />
              ))
            )
          )}

          {/* Community Board */}
          {!loading && !error && view === 'board' && (
            boardIntents.length === 0 ? (
              <EmptyState
                title={t('screens.community.boardQuietRightNow')}
                body={t('screens.community.boardEmptyBody')}
                cta={{ label: t('screens.community.postYours'), onClick: () => setComposerOpen(true) }}
              />
            ) : isMobile ? (
              <div className="space-y-3 max-w-md mx-auto">
                {boardIntents.map((it) => (
                  <IntentCard key={it.intent_id} intent={it} themedFallback variant="board" />
                ))}
              </div>
            ) : (
              // Desktop: same uniform 3-column grid as My Matches / My Posts
              // so the page reads consistently across views. Location + match
              // chips are overlaid on the photo (bottom-left) so the body
              // stays focused on title + scope.
              renderDesktopGrid(boardIntents, (it) => (
                <IntentCard key={it.intent_id} intent={it} themedFallback variant="board" />
              ))
            )
          )}

          {/* My Posts */}
          {!loading && !error && view === 'posts' && (
            myPosts.length === 0 ? (
              <EmptyState
                title={t('screens.community.youHavenTPostedYet')}
                body={t('screens.community.postsEmptyBody')}
                cta={{ label: t('screens.community.newWish'), onClick: () => setComposerOpen(true) }}
              />
            ) : isMobile ? (
              <div className="space-y-3 max-w-md mx-auto">
                {myPosts.map((it) => (
                  <IntentCard key={it.intent_id} intent={it} to={`/intents/match/${it.intent_id}`} variant="my-posts" />
                ))}
              </div>
            ) : (
              renderDesktopGrid(myPosts, (it) => (
                <IntentCard
                  key={it.intent_id}
                  intent={it}
                  to={`/intents/match/${it.intent_id}`}
                  variant="my-posts"
                />
              ))
            )
          )}

          {/* Members */}
          {!loading && !error && view === 'members' && (
            !showMembersTab ? (
              <EmptyState
                title={t('screens.community.browseFullMembersList')}
                body={t('screens.community.membersEmptyBody')}
                cta={{ label: t('screens.community.openMembers'), onClick: () => navigate('/comm/members') }}
              />
            ) : members.length === 0 ? (
              <EmptyState
                title={t('screens.community.noMembersYet')}
                body={t('screens.community.membersEmptyInvite')}
              />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <MemberListRow
                    key={m.vitana_id ?? `${m.registration_seq}`}
                    member={m}
                    onOpen={(vid) => vid && navigate(`/profile/${vid}`)}
                  />
                ))}
              </div>
            )
          )}
        </div>
          </div>
        </div>
      </AppLayout>

      {/* Mobile sub-view picker sheet */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t('screens.community.chooseView')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 pb-6">
            {visibleViewOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { setView(o.value); setPickerOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  view === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="text-xl">{o.icon}</span>
                <span className="font-medium">{t(o.labelKey)}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Find a Match filter sheet */}
      <FindMatchFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onApply={setFilters}
        matches={allMatches}
        viewedIds={viewedIds}
      />

      {/* Composer modal */}
      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => { setComposerOpen(false); refresh(); }}
      />
    </>
  );
}

/**
 * Render a list of items in a uniform 3-column desktop grid. All cards
 * have the same width so image aspect ratios + body content render
 * consistently — no alternating big/small that leaves rows uneven when
 * cards have a fixed-aspect image + variable-height body.
 */
function renderDesktopGrid<T>(
  items: T[],
  renderItem: (item: T) => React.ReactNode,
): React.ReactNode {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((it, idx) => (
        <div key={idx}>{renderItem(it)}</div>
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder matching the four sub-views. Replaces the previous
 * full-screen spinner so cold-load Find-a-Match feels paint-instant instead
 * of blank-then-pop. Card heights are approximate — they're hidden the
 * instant the real data lands.
 */
function FindPartnerLoadingSkeleton({ view, isMobile }: { view: View; isMobile: boolean }) {
  const count = isMobile ? 3 : 6;
  const gridClass = isMobile
    ? 'space-y-5 pb-32 max-w-md mx-auto'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  if (view === 'members') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // matches / board / posts — card-shaped skeletons
  const cardHeight = view === 'posts' ? 'h-36' : 'h-64';
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border overflow-hidden">
          <Skeleton className={`w-full ${cardHeight}`} />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, body, cta }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex flex-col items-center">
        {icon ?? <Users className="h-10 w-10 text-muted-foreground mb-3" />}
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-5">{body}</p>
        {cta && (
          <Button onClick={cta.onClick}>{cta.label}</Button>
        )}
      </div>
    </div>
  );
}

/**
 * A single tappable community-member row. Shared between the Members
 * directory tab and the Autopilot suggestion fallback on My Matches.
 * `badge` lets the suggestion list flag rows as Autopilot picks.
 */
function MemberListRow({
  member,
  onOpen,
  badge,
}: {
  member: CommunityMember;
  onOpen: (vitanaId: string | null) => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(member.vitana_id)}
      className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={getDisplayAvatarUrl(member)} alt={member.display_name ?? ''} />
        <AvatarFallback>{initialsFor(member.display_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium truncate">{member.display_name ?? 'Member'}</span>
          {member.vitana_id && (
            <span className="text-sm text-muted-foreground">@{member.vitana_id}</span>
          )}
          {badge}
          {member.registration_seq != null && (
            <span className="text-[11px] uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{t('screens.community.memberRegistration_seq', { registration_seq: member.registration_seq })}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {member.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {member.location}
            </span>
          )}
          {member.dance_preview && member.dance_preview.variety && (
            <span className="inline-flex items-center gap-1 text-foreground/80">
              {[member.dance_preview.variety, member.dance_preview.level, member.dance_preview.role]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

interface SuggestedMatchesProps {
  members: CommunityMember[];
  loading: boolean;
  onPostWish: () => void;
  onOpenMember: (vitanaId: string | null) => void;
}

/**
 * Autopilot fallback for an empty My Matches list. Surfaces real community
 * members as suggestions so the tab is never a dead end, while keeping the
 * "post a wish" CTA front-and-centre as the path to real AI-ranked matches.
 * If the community has no one to suggest, we fall back to the plain empty
 * state so the screen still reads correctly.
 */
function SuggestedMatches({ members, loading, onPostWish, onOpenMember }: SuggestedMatchesProps) {
  if (!loading && members.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-10 w-10 text-muted-foreground mb-3" />}
        title={t('screens.community.noMatchesYet')}
        body={t('screens.community.matchesEmptyBody')}
        cta={{ label: t('screens.community.postNewWish'), onClick: onPostWish }}
      />
    );
  }

  const autopilotBadge = (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full bg-primary/10 text-primary px-1.5 py-0.5">
      <Sparkles className="h-3 w-3" />
      {t('screens.community.autopilotSuggestionBadge')}
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto pb-28">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('screens.community.autopilotSuggestionsTitle')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('screens.community.autopilotSuggestionsBody')}
        </p>
      </div>
      <Button onClick={onPostWish} className="mb-4 w-full sm:w-auto gap-1.5">
        <Plus className="h-4 w-4" />
        {t('screens.community.postNewWish')}
      </Button>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <MemberListRow
              key={m.vitana_id ?? `${m.registration_seq}`}
              member={m}
              onOpen={onOpenMember}
              badge={autopilotBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
}
