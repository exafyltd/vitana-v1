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
 * - My Posts        → user's own dance.* + fitness.* intents.
 * - Members         → community members directory (visible only while
 *                     total ≤ 1000; otherwise hidden).
 *
 * Tap any member card → existing /profile/:vitana_id (Public Profile).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Users, Heart, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { IntentCard } from '@/components/intents/IntentCard';
import { IntentMatchCard } from '@/components/intents/IntentMatchCard';
import { IntentComposer } from '@/components/intents/IntentComposer';
import {
  listMyIntents,
  getIntentBoard,
  getFindPartnerMatches,
  getCommunityMemberCount,
  type FindPartnerMatch,
  type UserIntent,
} from '@/lib/intentApi';
import { t } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  'https://gateway-q74ibpv6ia-uc.a.run.app/api/v1';

const MEMBERS_TAB_THRESHOLD = 1000;

type View = 'matches' | 'board' | 'posts' | 'members';

const VIEW_OPTIONS: { value: View; icon: string; label: string }[] = [
  { value: 'matches', icon: '💃', label: 'My Matches' },
  { value: 'board',   icon: '📣',   label: 'Community Board' },
  { value: 'posts',   icon: '📝',   label: 'My Posts' },
  { value: 'members', icon: '👥',   label: 'Members' },
];

function viewMeta(v: View) {
  return VIEW_OPTIONS.find((o) => o.value === v) ?? VIEW_OPTIONS[0];
}

function isFindPartnerCategory(cat: string | null | undefined): boolean {
  if (!cat) return false;
  return cat.startsWith('dance.') || cat.startsWith('fitness.');
}

function verticalChip(category: string | null) {
  if (!category) return null;
  if (category.startsWith('dance.')) return { icon: '💃', label: 'Dance', tone: 'bg-pink-100 text-pink-700 border-pink-200' };
  if (category.startsWith('fitness.')) return { icon: '💪', label: 'Fitness', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  return null;
}

interface MemberRow {
  vitana_id: string | null;
  registration_seq: number | null;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  member_since: string | null;
  dance_preview: { variety: string | null; level: string | null; role: string | null } | null;
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

export default function FindPartner() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = (searchParams.get('view') as View) || 'matches';
  const [view, setView] = useState<View>(initialView);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  // Members tab gate
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const showMembersTab = memberCount === null || memberCount <= MEMBERS_TAB_THRESHOLD;

  // Sub-view data
  const [matches, setMatches] = useState<FindPartnerMatch[]>([]);
  const [boardIntents, setBoardIntents] = useState<UserIntent[]>([]);
  const [myPosts, setMyPosts] = useState<UserIntent[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ?view= in URL synced.
  useEffect(() => {
    const current = searchParams.get('view');
    if (current !== view) {
      const next = new URLSearchParams(searchParams);
      next.set('view', view);
      setSearchParams(next, { replace: true });
    }
  }, [view, searchParams, setSearchParams]);

  // Fetch member count once on mount (gates Members tab).
  useEffect(() => {
    getCommunityMemberCount()
      .then(setMemberCount)
      .catch(() => setMemberCount(null));
  }, []);

  // Per-view fetch.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === 'matches') {
        setMatches(await getFindPartnerMatches());
      } else if (view === 'board') {
        const resp = await getIntentBoard({
          surface: 'find_a_partner',
          categories: ['dance.*', 'fitness.*'],
          limit: 50,
        });
        setBoardIntents(resp.intents ?? []);
      } else if (view === 'posts') {
        const all = await listMyIntents({ status: 'open' });
        setMyPosts(all.filter((it) => isFindPartnerCategory(it.category)));
      } else if (view === 'members') {
        if (!session?.access_token) {
          setMembers([]);
        } else {
          const params = new URLSearchParams({ limit: '50', sort: 'newest' });
          const res = await fetch(`${GATEWAY_URL}/community/members?${params.toString()}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const data = await res.json();
          setMembers(Array.isArray(data?.members) ? data.members : []);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [view, session]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Active sub-view metadata for the pill label + sheet header.
  const active = viewMeta(view);
  const filterLabel = `${active.icon} ${active.label}`;

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
          title={t('screens.community.findMatch2')}
          description="Dance and fitness partners — matched by AI, ranked by fit."
        />

        <UtilityActionButton className="min-w-0" compact={isMobile}>
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder={t('screens.community.searchPostsMatches')}
              onSearch={() => { /* search wiring is per-view; leave as no-op for v1 */ }}
              filterLabel={filterLabel}
              onFilterClick={() => setPickerOpen(true)}
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
                  {o.icon} {o.label}
                </SplitBarTrigger>
              ))}
            </SplitBarList>
          </SplitBar>
        )}

        <div className="mt-4">
          {loading && (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-destructive py-4">{t('screens.community.couldnTLoadError', { error })}</div>
          )}

          {/* My Matches */}
          {!loading && !error && view === 'matches' && (
            matches.length === 0 ? (
              <EmptyState
                icon={<Heart className="h-10 w-10 text-muted-foreground mb-3" />}
                title="No matches yet"
                body="Post a wish to start. The AI ranks people across dance and fitness — your matches show up here."
                cta={{ label: 'Post a new wish', onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {matches.map((m) => {
                  const chip = verticalChip(m.source_category);
                  const scorePct = Math.round((m.score ?? 0) * 100);
                  return (
                    <div key={m.match_id} className="rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between px-4 pt-3 text-xs">
                        {chip && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${chip.tone}`}>
                            <span>{chip.icon}</span>
                            <span>{chip.label}</span>
                          </span>
                        )}
                        <span className="font-medium text-primary">{t('screens.community.scorepctMatch', { scorePct })}</span>
                      </div>
                      <IntentMatchCard match={m} perspective="outgoing" onAction={() => void refresh()} />
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Community Board */}
          {!loading && !error && view === 'board' && (
            boardIntents.length === 0 ? (
              <EmptyState
                title={t('screens.community.boardQuietRightNow')}
                body="Be the first to post a dance or fitness wish — others will see it here."
                cta={{ label: 'Post yours', onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {boardIntents.map((it) => (
                  <IntentCard key={it.intent_id} intent={it} />
                ))}
              </div>
            )
          )}

          {/* My Posts */}
          {!loading && !error && view === 'posts' && (
            myPosts.length === 0 ? (
              <EmptyState
                title={t('screens.community.youHavenTPostedYet')}
                body="Post your dance or fitness wish — Vitana will match you with people who fit."
                cta={{ label: 'New wish', onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {myPosts.map((it) => (
                  <IntentCard key={it.intent_id} intent={it} to={`/intents/match/${it.intent_id}`} />
                ))}
              </div>
            )
          )}

          {/* Members */}
          {!loading && !error && view === 'members' && (
            !showMembersTab ? (
              <EmptyState
                title={t('screens.community.browseFullMembersList')}
                body="The community is growing — see everyone in the dedicated members directory."
                cta={{ label: 'Open Members', onClick: () => navigate('/comm/members') }}
              />
            ) : members.length === 0 ? (
              <EmptyState
                title={t('screens.community.noMembersYet')}
                body="Be the first — invite a friend to join Vitana."
              />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <button
                    key={m.vitana_id ?? `${m.registration_seq}`}
                    type="button"
                    onClick={() => m.vitana_id && navigate(`/profile/${m.vitana_id}`)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      {m.avatar_url ? <AvatarImage src={m.avatar_url} alt={m.display_name ?? ''} /> : null}
                      <AvatarFallback>{initialsFor(m.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium truncate">{m.display_name ?? 'Member'}</span>
                        {m.vitana_id && (
                          <span className="text-sm text-muted-foreground">@{m.vitana_id}</span>
                        )}
                        {m.registration_seq != null && (
                          <span className="text-[11px] uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                            Member #{m.registration_seq}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {m.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.location}
                          </span>
                        )}
                        {m.dance_preview && m.dance_preview.variety && (
                          <span className="inline-flex items-center gap-1 text-foreground/80">
                            {[m.dance_preview.variety, m.dance_preview.level, m.dance_preview.role]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
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
                <span className="font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Composer modal */}
      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => { setComposerOpen(false); void refresh(); }}
      />
    </>
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
