import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import SEO from '@/components/SEO';
import { useEventGame, useEventGameJoin, useEventGamePhase, useEventGameFeatureFlag } from '@/hooks/useEventGame';
import { EventGameLandingView } from '@/components/event-game/EventGameLandingView';
import { EventGameCelebration } from '@/components/event-game/EventGameCelebration';
import { EventGameLeaderboardView } from '@/components/event-game/EventGameLeaderboardView';

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

  const handleJoin = async () => {
    if (!user) {
      const slugForTenant = localStorage.getItem('tenant_slug') || 'maxina';
      const loginRoute = ['maxina', 'alkalma', 'earthlinks'].includes(slugForTenant) ? `/${slugForTenant}` : '/maxina';
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

  if (gameQuery.isLoading || flagQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <EventGameCelebration
        open={showCelebration}
        onOpenChange={(o) => {
          setShowCelebration(o);
          if (!o) navigate('/community/event-game');
        }}
        title={t('eventGame.join.celebrateTitle')}
        points={t('eventGame.join.celebratePoints', { points: game.points_registration })}
      >
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('eventGame.join.nextTitle')}</p>
          <p>{t('eventGame.join.nextBody')}</p>
        </div>
      </EventGameCelebration>
      <EventGameLeaderboardView eventGameId={game.id} live={phase === 'live'} open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </>
  );
}
