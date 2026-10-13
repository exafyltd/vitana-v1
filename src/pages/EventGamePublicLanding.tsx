import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { ArchetypeSkeleton, ScreenFrame } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { Button } from '@/components/ui/button';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import SEO from '@/components/SEO';
import { useEventGame, useEventGameJoin, useEventGamePhase, useEventGameFeatureFlag, type EventGame } from '@/hooks/useEventGame';
import { EventGameLandingView } from '@/components/event-game/EventGameLandingView';
import { EventGameCelebration } from '@/components/event-game/EventGameCelebration';
import { EventGameLeaderboardView } from '@/components/event-game/EventGameLeaderboardView';
import { readStoredTenantSlug } from '@/lib/retired-tenants';

/** The QR-code destination: /e/game/:slug — public, no login wall (mounted
 * with AuthGuard allowGuest in App.tsx), event-specific (never a generic
 * landing page the visitor has to search from). A signed-out visitor sees
 * the full pitch; tapping Join routes them through sign-in and back here. */
export default function EventGamePublicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const gameQuery = useEventGame(slug);
  const game = gameQuery.data;
  const phase = useEventGamePhase(game);
  const flagQuery = useEventGameFeatureFlag();
  const { isParticipant, join } = useEventGameJoin(game?.id);
  const [showCelebration, setShowCelebration] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const spotlight = useSpotlightEnabled();

  const handleJoin = async () => {
    if (!user) {
      const slugForTenant = readStoredTenantSlug('tenant_slug') || 'maxina';
      const loginRoute = ['maxina', 'alkalma'].includes(slugForTenant) ? `/${slugForTenant}` : '/maxina';
      navigate(`${loginRoute}?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (isParticipant) {
      navigate('/community/event-game');
      return;
    }
    await join.mutateAsync();
    setShowCelebration(true);
  };

  // The join celebration and the leaderboard — the same on both paths.
  const dialogs = (g: EventGame) => (
    <>
      <EventGameCelebration
        open={showCelebration}
        onOpenChange={(o) => {
          setShowCelebration(o);
          if (!o) navigate('/community/event-game');
        }}
        title={t('eventGame.join.celebrateTitle')}
        points={t('eventGame.join.celebratePoints', { points: g.points_registration })}
      >
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('eventGame.join.nextTitle')}</p>
          <p>{t('eventGame.join.nextBody')}</p>
        </div>
      </EventGameCelebration>
      <EventGameLeaderboardView eventGameId={g.id} live={phase === 'live'} open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </>
  );

  // VTID-05117 — Spotlight (desktop + flag): the `detail` archetype; the game is
  // the screen's one spotlight card with the same Join / Leaderboard actions and
  // the same dialogs. Phones and flag-off keep the game landing below.
  if (spotlight) {
    const loading = gameQuery.isLoading || flagQuery.isLoading;
    const unavailable = !loading && (!game || flagQuery.data === false);
    return (
      <>
        {game && <SEO title={game.name} description={game.description ?? undefined} />}
        <ScreenFrame archetype="detail">
          {loading ? (
            <ArchetypeSkeleton archetype="detail" />
          ) : unavailable || !game ? (
            <VCard size="spotlight" title={<h1>{t('eventGame.landing.disabled')}</h1>} data-event-game-unavailable="" />
          ) : phase === 'ended' ? (
            <VCard
              size="spotlight"
              media={game.hero_image_url ? { src: game.hero_image_url, alt: '' } : undefined}
              priority
              eyebrow={t('eventGame.landing.kicker')}
              title={<h1>{t('eventGame.landing.notLiveEndedTitle')}</h1>}
              body={t('eventGame.landing.notLiveEndedBody')}
              actions={
                <Button variant="outline" onClick={() => setLeaderboardOpen(true)} className="gap-1.5">
                  <Trophy className="size-4" aria-hidden="true" />
                  {t('eventGame.landing.ctaLeaderboard')}
                </Button>
              }
            />
          ) : (
            <VCard
              size="spotlight"
              media={game.hero_image_url ? { src: game.hero_image_url, alt: '' } : undefined}
              priority
              eyebrow={t('eventGame.landing.kicker')}
              title={<h1>{game.name || t('eventGame.landing.title')}</h1>}
              body={
                <div className="flex flex-col gap-3">
                  {game.description && <p>{game.description}</p>}
                  <ul className="flex flex-col gap-1 text-foreground">
                    <li>{t('eventGame.landing.bulletPost')}</li>
                    <li>{t('eventGame.landing.bulletLikes')}</li>
                    <li>{t('eventGame.landing.bulletClimb')}</li>
                    <li>{t('eventGame.landing.bulletWin')}</li>
                  </ul>
                  {(phase ?? 'pre') === 'pre' && <p>{t('eventGame.landing.notLivePreBody')}</p>}
                </div>
              }
              actions={
                <>
                  <Button onClick={handleJoin} disabled={join.isPending} className="gap-2">
                    {t('eventGame.landing.ctaJoin')}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" onClick={() => setLeaderboardOpen(true)} className="gap-1.5">
                    <Trophy className="size-4" aria-hidden="true" />
                    {t('eventGame.landing.ctaLeaderboard')}
                  </Button>
                </>
              }
              data-event-game-id={game.id}
            />
          )}
        </ScreenFrame>
        {game && dialogs(game)}
      </>
    );
  }

  if (gameQuery.isLoading || flagQuery.isLoading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md px-6 py-10">
        <ArchetypeSkeleton archetype="detail" />
      </div>
    );
  }

  if (!game || flagQuery.data === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">{t('eventGame.landing.disabled')}</p>
      </div>
    );
  }

  return (
    <>
      <SEO title={game.name} description={game.description ?? undefined} />
      <EventGameLandingView
        game={game}
        phase={phase ?? 'pre'}
        joining={join.isPending}
        onJoin={handleJoin}
        onViewLeaderboard={() => setLeaderboardOpen(true)}
      />
      {dialogs(game)}
    </>
  );
}
