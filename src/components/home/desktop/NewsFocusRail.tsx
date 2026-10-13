/**
 * VTID-05108 — the context rail of the desktop News focus feed (Spotlight on).
 *
 * Built only from data the app already loads (contract SR-24): the feed itself
 * (up next, people to meet, feature announcements), the community-events
 * cache the Events screen and the route prefetch share, the Vitana Index, the
 * Guided Journey progress, the did-you-know tip and the event game. A block
 * with nothing real to show renders nothing — no placeholder numbers, no empty
 * headings. Every card is `compact` or `row` (SR-08).
 */
import { useId, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Lightbulb, MessageCircle, Play, Share2, Sparkles, Trophy, X } from 'lucide-react';
import { VCard } from '@/components/ui/vcard';
import { communityEventToVCard, feedPersonToVCard } from '@/components/ui/vcard/adapters';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { useVitanaIndex } from '@/hooks/useVitanaIndex';
import { useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';
import { useAudiobookPlayer } from '@/context/AudiobookPlayerProvider';
import { useDidYouKnowTip } from '@/hooks/useDidYouKnowTip';
import { useInviteFriendShare } from '@/hooks/useInviteFriendShare';
import {
  useEventGame,
  useEventGameFeatureFlag,
  useEventGameJoin,
  useEventGamePhase,
  useMyEventGameStanding,
} from '@/hooks/useEventGame';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';
import { matchCategoryLabel } from '@/lib/matchReason';
import { fmtNumber, fmtTime } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import type { FeatureAnnouncementFeedItem, FeedItem } from '@/lib/news-feed-ranker';
import { INTERACTIVE_CARD_CLASS as RAIL_CARD_CLASS, activateProps, todaysEvents } from './focusCardUtils';
import type { PersonItem } from './focusFeedModel';

/** One rail block: a heading and its cards. Renders nothing without cards. */
export function RailSection({ title, testId, children }: { title: string; testId: string; children: ReactNode[] }) {
  const id = useId();
  const items = children.filter(Boolean);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} data-rail-block={testId} className="flex flex-col gap-2">
      <h2 id={id} className="text-sm font-bold text-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">{items}</ul>
    </section>
  );
}

/** A square icon in the compact thumbnail box, for cards without a picture. */
function IconThumb({ icon }: { icon: ReactNode }) {
  return <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">{icon}</div>;
}

// ── Up next ────────────────────────────────────────────────────────────────

export interface UpNextPreview {
  key: string;
  title: string;
  meta?: string;
  image: string | null;
}

export function UpNextBlock({ previews, onSelect }: { previews: UpNextPreview[]; onSelect: (key: string) => void }) {
  return (
    <RailSection title={t('spotlightFeed.rail.upNext')} testId="up-next">
      {previews.map((p) => (
        <li key={p.key}>
          <VCard
            as="div"
            size="compact"
            media={{ src: p.image, alt: '' }}
            title={p.title}
            meta={p.meta}
            className={RAIL_CARD_CLASS}
            {...activateProps(() => onSelect(p.key))}
          />
        </li>
      ))}
    </RailSection>
  );
}

// ── Today ──────────────────────────────────────────────────────────────────

export function TodayBlock() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  // Same query key + function as useCommunityEvents and the route prefetch, so
  // this reads the cache the Events screen already fills (no realtime channel).
  const { data: events = [] } = useQuery({
    queryKey: ['global-community-events', user?.id ?? 'anonymous'],
    queryFn: fetchCommunityEventsQueryFn,
    staleTime: 2 * 60 * 1000,
    enabled: !loading && !!user,
  });
  const today = todaysEvents(events, new Date());
  return (
    <RailSection title={t('spotlightFeed.rail.today')} testId="today">
      {today.map((event) => {
        const d = communityEventToVCard(event);
        const time = fmtTime(new Date(event.start_time), { hour: '2-digit', minute: '2-digit' });
        return (
          <li key={d.key}>
            <VCard
              as="div"
              size="compact"
              media={d.media}
              title={d.title}
              meta={d.meta ? t('spotlightFeed.today.timeAndPlace', { time, place: d.meta }) : time}
              className={RAIL_CARD_CLASS}
              {...activateProps(() => navigate(d.href!))}
            />
          </li>
        );
      })}
    </RailSection>
  );
}

// ── Your journey (Vitana Index + Guided Journey) ───────────────────────────

const TREND_HEADLINE = {
  up: 'screens.home.vitanaIndexUpHeadline',
  down: 'screens.home.vitanaIndexDownHeadline',
  stable: 'screens.home.vitanaIndexStableHeadline',
} as const;

export function JourneyBlock() {
  const navigate = useNavigate();
  const { index, isLoading } = useVitanaIndex();
  const journey = useGuidedJourneyProgress();
  const audiobook = useAudiobookPlayer();

  const cards: ReactNode[] = [];
  if (!isLoading && index) {
    const history = index.history ?? [];
    const pct =
      history.length >= 2 ? Math.abs(Math.round(((history[history.length - 1].score - history[0].score) / 999) * 100)) : 0;
    cards.push(
      <li key="index">
        <VCard
          as="div"
          size="compact"
          mediaSlot={<IconThumb icon={<Activity className="h-6 w-6" aria-hidden="true" />} />}
          eyebrow={t('screens.home.vitanaIndexEyebrow')}
          title={t('spotlightFeed.index.title', { score: fmtNumber(index.total) })}
          meta={t(TREND_HEADLINE[index.trend], { pct })}
          className={RAIL_CARD_CLASS}
          {...activateProps(() => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT)))}
        />
      </li>,
    );
  }
  if (!journey.loading && journey.totalSessions > 0) {
    const next = journey.nextSession;
    cards.push(
      <li key="journey">
        <VCard
          as="div"
          size="compact"
          mediaSlot={<IconThumb icon={<Sparkles className="h-6 w-6" aria-hidden="true" />} />}
          eyebrow={t('screens.home.longevityJourneyEyebrow')}
          title={next ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
          meta={next ? t('screens.home.longevityJourneySubtext', { session: next.session }) : undefined}
          actions={
            next && audiobook ? (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t('screens.home.playTodaysEpisode', { session: next.session })}
                data-testid="rail-play-todays-episode"
                onClick={(e) => {
                  e.stopPropagation();
                  void audiobook.start({ episode: next.session });
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Play className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Button>
            ) : undefined
          }
          className={RAIL_CARD_CLASS}
          {...activateProps(() => navigate('/autopilot'))}
        />
      </li>,
    );
  }
  return (
    <RailSection title={t('spotlightFeed.rail.journey')} testId="journey">
      {cards}
    </RailSection>
  );
}

// ── People to meet ─────────────────────────────────────────────────────────

function personMeta(p: PersonItem): string {
  if (p.kind === 'match') {
    return [matchCategoryLabel(p.match_reason), t('screens.home.matchPercent', { score: p.compatibility_score })].join(' · ');
  }
  if (p.kind === 'performer') return t('screens.home.mostImproved');
  return t('newsCard.member.eyebrow');
}

export function PeopleBlock({
  people,
  onOpen,
  limit = 5,
}: {
  people: PersonItem[];
  onOpen?: (item: FeedItem) => void;
  limit?: number;
}) {
  const navigate = useNavigate();
  return (
    <RailSection title={t('spotlightFeed.rail.people')} testId="people">
      {people.slice(0, limit).map((p) => {
        const d = feedPersonToVCard(p);
        const name = d.title || t('newsCard.member.newMember');
        return (
          <li key={d.key}>
            <VCard
              as="div"
              size="row"
              media={d.media}
              title={name}
              meta={personMeta(p)}
              actions={
                p.kind === 'new_member' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen?.(p);
                      navigate(`/inbox/u/${p.user_id}`);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('newsCard.member.sayHello')}
                  </Button>
                ) : undefined
              }
              className={RAIL_CARD_CLASS}
              {...activateProps(() => {
                onOpen?.(p);
                navigate(d.href!);
              })}
            />
          </li>
        );
      })}
    </RailSection>
  );
}

// ── Good to know (did-you-know, feature news, invite, event game) ──────────

function DidYouKnowRailCard() {
  const navigate = useNavigate();
  const { tip, accept, decline } = useDidYouKnowTip();
  if (!tip) return null;
  const showMe = () => {
    const url = accept();
    if (!url) return;
    try {
      sessionStorage.setItem(
        'vitana.last_tour_tip',
        JSON.stringify({ tip_key: tip.tip_key, feature_key: tip.feature_key, voice_on_nav: tip.voice_on_nav, landed_at: Date.now() }),
      );
    } catch {
      // storage blocked — the tour simply has no voice follow-up
    }
    navigate(url);
  };
  return (
    <VCard
      as="div"
      size="compact"
      data-testid="dyk-rail-card"
      mediaSlot={<IconThumb icon={<Lightbulb className="h-6 w-6" aria-hidden="true" />} />}
      eyebrow={t('screens.proactive.didYouKnow')}
      title={tip.card_copy}
      meta={tip.cta_label}
      actions={
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('screens.proactive.dismissTip')}
          onClick={(e) => {
            e.stopPropagation();
            decline('tip');
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      }
      className={RAIL_CARD_CLASS}
      {...activateProps(showMe)}
    />
  );
}

function EventGameRailCard() {
  const navigate = useNavigate();
  const flagQuery = useEventGameFeatureFlag();
  const game = useEventGame().data;
  const phase = useEventGamePhase(game);
  const { isParticipant } = useEventGameJoin(game?.id);
  const standing = useMyEventGameStanding(game?.id, { live: true });
  if (!flagQuery.data || !game || !isParticipant) return null;
  if (phase !== 'pre' && phase !== 'live') return null;
  const rank = standing.data?.rank ?? 0;
  const score = standing.data?.score ?? 0;
  return (
    <VCard
      as="div"
      size="compact"
      mediaSlot={<IconThumb icon={<Trophy className="h-6 w-6" aria-hidden="true" />} />}
      title={rank > 0 ? t('eventGame.feedBadge.rankPoints', { rank, points: score }) : t('eventGame.join.celebrateScore', { score })}
      className={RAIL_CARD_CLASS}
      {...activateProps(() => navigate('/community/event-game'))}
    />
  );
}

export function GoodToKnowBlock({
  features,
  onFeatureOpen,
}: {
  features: FeatureAnnouncementFeedItem[];
  onFeatureOpen?: (item: FeedItem) => void;
}) {
  const navigate = useNavigate();
  const { shareInvite } = useInviteFriendShare();
  const items: ReactNode[] = [
    <li key="event-game" className="empty:hidden">
      <EventGameRailCard />
    </li>,
    <li key="dyk" className="empty:hidden">
      <DidYouKnowRailCard />
    </li>,
    ...features.slice(0, 2).map((f) => (
      <li key={f.id}>
        <VCard
          as="div"
          size="compact"
          mediaSlot={<IconThumb icon={<Sparkles className="h-6 w-6" aria-hidden="true" />} />}
          eyebrow={t(
            f.variant === 'brand-new-feature' ? 'featureAnnouncementCard.brandNew.eyebrow' : 'featureAnnouncementCard.didYouKnow.eyebrow',
          )}
          title={f.feature_title}
          meta={f.description}
          className={RAIL_CARD_CLASS}
          {...activateProps(() => {
            onFeatureOpen?.(f);
            navigate(f.deep_link);
          })}
        />
      </li>
    )),
    <li key="invite">
      <VCard
        as="div"
        size="compact"
        mediaSlot={<IconThumb icon={<Share2 className="h-6 w-6 rtl:-scale-x-100" aria-hidden="true" />} />}
        eyebrow={t('screens.downloadFlyer.inviteCardEyebrow')}
        title={t('screens.downloadFlyer.inviteCardTitle')}
        meta={t('screens.downloadFlyer.inviteCardBody')}
        className={RAIL_CARD_CLASS}
        {...activateProps(() => void shareInvite())}
      />
    </li>,
  ];
  return (
    <RailSection title={t('spotlightFeed.rail.goodToKnow')} testId="good-to-know">
      {items}
    </RailSection>
  );
}

// ── The rail ───────────────────────────────────────────────────────────────

export interface NewsFocusRailProps {
  upNext: UpNextPreview[];
  onSelectUpNext: (key: string) => void;
  people: PersonItem[];
  features: FeatureAnnouncementFeedItem[];
  onItemOpen?: (item: FeedItem) => void;
}

export function NewsFocusRail({ upNext, onSelectUpNext, people, features, onItemOpen }: NewsFocusRailProps) {
  return (
    <div className="flex flex-col gap-5" data-news-rail="">
      <p className="text-xs text-muted-foreground">{t('spotlight.feed.keyboardHint')}</p>
      <UpNextBlock previews={upNext} onSelect={onSelectUpNext} />
      <TodayBlock />
      <JourneyBlock />
      <PeopleBlock people={people} onOpen={onItemOpen} />
      <GoodToKnowBlock features={features} onFeatureOpen={onItemOpen} />
    </div>
  );
}
