import { Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import type { EventGame, EventGamePhase } from '@/hooks/useEventGame';
import { DecorativeWave } from '@/components/event-game/DecorativeWave';

interface EventGameLandingViewProps {
  game: EventGame;
  phase: EventGamePhase;
  playerCount?: number;
  joining: boolean;
  onJoin: () => void;
  onViewLeaderboard: () => void;
}

const GRADIENT_BG =
  'radial-gradient(ellipse 120% 55% at 50% 0%, hsl(var(--card)) 0%, hsl(var(--category-7) / 0.15) 30%, hsl(var(--category-7) / 0.3) 65%, hsl(var(--category-7) / 0.45) 100%)';

/** The energetic, game-not-a-feature landing screen — first thing scanned
 * from the QR code, or reached in-app before joining. Deliberately not a
 * corporate/text-heavy layout: one hero, a short bullet list, one big CTA. */
export function EventGameLandingView({ game, phase, playerCount, joining, onJoin, onViewLeaderboard }: EventGameLandingViewProps) {
  if (phase === 'ended') {
    return (
      <div
        // design-allow-next-line: viewport-bound screen height
        className="min-h-[60vh] flex items-center justify-center relative overflow-hidden"
        style={{ background: GRADIENT_BG }}
      >
        <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-16 text-primary-foreground/40" />
        <div className="relative flex flex-col items-center px-6 text-center gap-3 max-w-md w-full mx-auto">
          <div className="rounded-2xl bg-card/70 backdrop-blur px-6 py-6 shadow-[0_8px_24px_rgba(31,143,199,0.25)] w-full">
            <h1 className="text-2xl font-bold text-foreground">{t('eventGame.landing.notLiveEndedTitle')}</h1>
            <p className="text-muted-foreground mt-2">{t('eventGame.landing.notLiveEndedBody')}</p>
          </div>
          <Button
            variant="outline"
            onClick={onViewLeaderboard}
            className="mt-2 rounded-full bg-card/70 backdrop-blur border-border text-category-7 hover:bg-card hover:text-category-7 flex items-center justify-center gap-1.5"
          >
            <Trophy className="w-4 h-4" />
            {t('eventGame.landing.ctaLeaderboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: GRADIENT_BG }}
    >
      <div className="pointer-events-none absolute -top-10 -start-10 w-64 h-64 rounded-full bg-card/25 blur-2xl" />
      <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-20 text-primary-foreground/40" />

      <div className="relative flex flex-col items-center px-6 py-10 gap-4 max-w-md w-full mx-auto text-center">
        {game.hero_image_url && (
          <img src={game.hero_image_url} alt="" className="w-full max-h-56 object-cover rounded-2xl mb-2 shadow-lg" />
        )}
        <div className="w-20 h-20 rounded-full bg-card/50 backdrop-blur flex items-center justify-center ring-4 ring-border/40 shadow-lg">
          <Trophy className="w-9 h-9 text-category-7" />
        </div>

        <div className="text-sm font-bold tracking-wide text-category-7 uppercase">{t('eventGame.landing.kicker')}</div>
        <h1 className="text-3xl font-extrabold leading-tight text-foreground">{game.name || t('eventGame.landing.title')}</h1>
        {game.description && <p className="text-muted-foreground">{game.description}</p>}

        <div className="w-full rounded-2xl bg-card/70 backdrop-blur px-5 py-4 shadow-[0_4px_16px_rgba(31,143,199,0.15)] flex flex-col gap-2 text-lg text-foreground mt-2">
          <div>{t('eventGame.landing.bulletPost')}</div>
          <div>{t('eventGame.landing.bulletLikes')}</div>
          <div>{t('eventGame.landing.bulletClimb')}</div>
          <div>{t('eventGame.landing.bulletWin')}</div>
        </div>

        {typeof playerCount === 'number' && playerCount > 0 && (
          <div className="text-sm text-muted-foreground mt-1">
            {t('eventGame.landing.playing', { count: playerCount })}
          </div>
        )}

        {phase === 'pre' && (
          <p className="text-sm text-muted-foreground">{t('eventGame.landing.notLivePreBody')}</p>
        )}

        <Button
          size="lg"
          className="w-full max-w-xs mt-4 text-lg h-14 rounded-full bg-gradient-to-r from-category-7/70 to-category-7 hover:from-category-7/45 hover:to-category-7/85 shadow-[0_10px_28px_rgba(31,143,199,0.45)] hover:shadow-[0_12px_32px_rgba(31,143,199,0.55)] transition-all duration-300 border-0 flex items-center justify-center gap-2"
          onClick={onJoin}
          disabled={joining}
        >
          {t('eventGame.landing.ctaJoin')}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={onViewLeaderboard}
          className="text-category-7 hover:bg-card/50 hover:text-category-7 flex items-center gap-1.5"
        >
          <Trophy className="w-4 h-4" />
          {t('eventGame.landing.ctaLeaderboard')}
        </Button>
      </div>
    </div>
  );
}
