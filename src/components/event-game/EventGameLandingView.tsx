import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import type { EventGame, EventGamePhase } from '@/hooks/useEventGame';

interface EventGameLandingViewProps {
  game: EventGame;
  phase: EventGamePhase;
  playerCount?: number;
  joining: boolean;
  onJoin: () => void;
  onViewLeaderboard: () => void;
}

/** The energetic, game-not-a-feature landing screen — first thing scanned
 * from the QR code, or reached in-app before joining. Deliberately not a
 * corporate/text-heavy layout: one hero, a short bullet list, one big CTA. */
export function EventGameLandingView({ game, phase, playerCount, joining, onJoin, onViewLeaderboard }: EventGameLandingViewProps) {
  if (phase === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-3">
        <h1 className="text-2xl font-bold">{t('eventGame.landing.notLiveEndedTitle')}</h1>
        <p className="text-muted-foreground">{t('eventGame.landing.notLiveEndedBody')}</p>
        <Button variant="outline" onClick={onViewLeaderboard} className="mt-4">
          {t('eventGame.landing.ctaLeaderboard')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center gap-4">
      {game.hero_image_url && (
        <img src={game.hero_image_url} alt="" className="w-full max-h-56 object-cover rounded-2xl mb-2" />
      )}
      <div className="text-sm font-semibold tracking-wide text-primary">{t('eventGame.landing.kicker')}</div>
      <h1 className="text-3xl font-extrabold leading-tight">{game.name || t('eventGame.landing.title')}</h1>
      {game.description && <p className="text-muted-foreground">{game.description}</p>}

      <div className="flex flex-col gap-2 text-lg mt-2">
        <div>{t('eventGame.landing.bulletPost')}</div>
        <div>{t('eventGame.landing.bulletLikes')}</div>
        <div>{t('eventGame.landing.bulletClimb')}</div>
        <div>{t('eventGame.landing.bulletWin')}</div>
      </div>

      {typeof playerCount === 'number' && playerCount > 0 && (
        <div className="text-sm text-muted-foreground mt-2">
          {t('eventGame.landing.playing', { count: playerCount })}
        </div>
      )}

      {phase === 'pre' && (
        <p className="text-sm text-muted-foreground">{t('eventGame.landing.notLivePreBody')}</p>
      )}

      <Button size="lg" className="w-full max-w-xs mt-4 text-lg h-14" onClick={onJoin} disabled={joining}>
        {t('eventGame.landing.ctaJoin')}
      </Button>
      <Button variant="ghost" onClick={onViewLeaderboard}>
        {t('eventGame.landing.ctaLeaderboard')}
      </Button>
    </div>
  );
}
