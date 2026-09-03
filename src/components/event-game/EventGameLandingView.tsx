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
  'radial-gradient(ellipse 120% 55% at 50% 0%, #FFFFFF 0%, #E3F5FD 30%, #B8E4FA 65%, #8FD5FA 100%)';

/** The energetic, game-not-a-feature landing screen — first thing scanned
 * from the QR code, or reached in-app before joining. Deliberately not a
 * corporate/text-heavy layout: one hero, a short bullet list, one big CTA. */
export function EventGameLandingView({ game, phase, playerCount, joining, onJoin, onViewLeaderboard }: EventGameLandingViewProps) {
  if (phase === 'ended') {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center relative overflow-hidden"
        style={{ background: GRADIENT_BG }}
      >
        <DecorativeWave className="pointer-events-none absolute bottom-0 left-0 w-full h-16 text-white/40" />
        <div className="relative flex flex-col items-center px-6 text-center gap-3 max-w-md w-full mx-auto">
          <div className="rounded-2xl bg-white/70 backdrop-blur px-6 py-6 shadow-[0_8px_24px_rgba(31,143,199,0.25)] w-full">
            <h1 className="text-2xl font-bold text-[#0B4F70]">{t('eventGame.landing.notLiveEndedTitle')}</h1>
            <p className="text-[#4A7688] mt-2">{t('eventGame.landing.notLiveEndedBody')}</p>
          </div>
          <Button
            variant="outline"
            onClick={onViewLeaderboard}
            className="mt-2 rounded-full bg-white/70 backdrop-blur border-white text-[#1B8FC7] hover:bg-white hover:text-[#1B8FC7] flex items-center justify-center gap-1.5"
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
      <div className="pointer-events-none absolute -top-10 -left-10 w-64 h-64 rounded-full bg-white/25 blur-2xl" />
      <DecorativeWave className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-white/40" />

      <div className="relative flex flex-col items-center px-6 py-10 gap-4 max-w-md w-full mx-auto text-center">
        {game.hero_image_url && (
          <img src={game.hero_image_url} alt="" className="w-full max-h-56 object-cover rounded-2xl mb-2 shadow-lg" />
        )}
        <div className="w-20 h-20 rounded-full bg-white/50 backdrop-blur flex items-center justify-center ring-4 ring-white/40 shadow-lg">
          <Trophy className="w-9 h-9 text-[#1B8FC7]" />
        </div>

        <div className="text-sm font-bold tracking-wide text-[#1B8FC7] uppercase">{t('eventGame.landing.kicker')}</div>
        <h1 className="text-3xl font-extrabold leading-tight text-[#0B4F70]">{game.name || t('eventGame.landing.title')}</h1>
        {game.description && <p className="text-[#4A7688]">{game.description}</p>}

        <div className="w-full rounded-2xl bg-white/70 backdrop-blur px-5 py-4 shadow-[0_4px_16px_rgba(31,143,199,0.15)] flex flex-col gap-2 text-lg text-[#0B4F70] mt-2">
          <div>{t('eventGame.landing.bulletPost')}</div>
          <div>{t('eventGame.landing.bulletLikes')}</div>
          <div>{t('eventGame.landing.bulletClimb')}</div>
          <div>{t('eventGame.landing.bulletWin')}</div>
        </div>

        {typeof playerCount === 'number' && playerCount > 0 && (
          <div className="text-sm text-[#4A7688] mt-1">
            {t('eventGame.landing.playing', { count: playerCount })}
          </div>
        )}

        {phase === 'pre' && (
          <p className="text-sm text-[#4A7688]">{t('eventGame.landing.notLivePreBody')}</p>
        )}

        <Button
          size="lg"
          className="w-full max-w-xs mt-4 text-lg h-14 rounded-full bg-gradient-to-r from-[#6CC5EC] to-[#1B8FC7] hover:from-[#8FD5FA] hover:to-[#3AA6D6] shadow-[0_10px_28px_rgba(31,143,199,0.45)] hover:shadow-[0_12px_32px_rgba(31,143,199,0.55)] transition-all duration-300 border-0 flex items-center justify-center gap-2"
          onClick={onJoin}
          disabled={joining}
        >
          {t('eventGame.landing.ctaJoin')}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={onViewLeaderboard}
          className="text-[#1B8FC7] hover:bg-white/50 hover:text-[#1B8FC7] flex items-center gap-1.5"
        >
          <Trophy className="w-4 h-4" />
          {t('eventGame.landing.ctaLeaderboard')}
        </Button>
      </div>
    </div>
  );
}
