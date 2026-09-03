import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import SEO from '@/components/SEO';
import {
  useEventGame,
  useEventGameFeatureFlag,
  useEventGamePhase,
  useEventGameJoin,
} from '@/hooks/useEventGame';
import { EventGameLandingView } from '@/components/event-game/EventGameLandingView';
import { EventGameHomeView } from '@/components/event-game/EventGameHomeView';
import { EventGameResultsView } from '@/components/event-game/EventGameResultsView';
import { EventGameCelebration } from '@/components/event-game/EventGameCelebration';
import { EventGameLeaderboardView } from '@/components/event-game/EventGameLeaderboardView';

/** In-app entry point (as opposed to the public QR landing at
 * /e/game/:slug) — resolves the tenant's current scheduled/live game and
 * switches Landing/Home/Results purely by phase + join state, so this is
 * the only new authenticated route the feature needs. */
export default function EventGamePage() {
  const flagQuery = useEventGameFeatureFlag();
  const gameQuery = useEventGame();
  const game = gameQuery.data;
  const phase = useEventGamePhase(game);
  const { isParticipant, join } = useEventGameJoin(game?.id);
  const [showCelebration, setShowCelebration] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  if (flagQuery.isLoading || gameQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flagQuery.data || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">{t('eventGame.landing.disabled')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO title={game.name} description={game.description ?? undefined} />

      {phase === 'ended' ? (
        <EventGameResultsView game={game} />
      ) : isParticipant ? (
        <EventGameHomeView game={game} onViewLeaderboard={() => setLeaderboardOpen(true)} />
      ) : (
        <EventGameLandingView
          game={game}
          phase={phase ?? 'pre'}
          joining={join.isPending}
          onJoin={async () => {
            await join.mutateAsync();
            setShowCelebration(true);
          }}
          onViewLeaderboard={() => setLeaderboardOpen(true)}
        />
      )}

      <EventGameCelebration
        open={showCelebration}
        onOpenChange={setShowCelebration}
        title={t('eventGame.join.celebrateTitle')}
        points={t('eventGame.join.celebratePoints', { points: game.points_registration })}
      >
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('eventGame.join.nextTitle')}</p>
          <p>{t('eventGame.join.nextBody')}</p>
        </div>
      </EventGameCelebration>

      <EventGameLeaderboardView eventGameId={game.id} live={phase === 'live'} open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
    </div>
  );
}
