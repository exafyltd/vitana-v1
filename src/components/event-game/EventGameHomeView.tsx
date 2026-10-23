import { useState } from 'react';
import { Trophy, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { useMyEventGameStanding } from '@/hooks/useEventGame';
import type { EventGame } from '@/hooks/useEventGame';
import { EventGameCountdown } from '@/components/event-game/EventGameCountdown';
import { EventGamePostCTA } from '@/components/event-game/EventGamePostCTA';
import { EventGameRulesSheet } from '@/components/event-game/EventGameRulesSheet';
import { DecorativeWave } from '@/components/event-game/DecorativeWave';

interface EventGameHomeViewProps {
  game: EventGame;
  onViewLeaderboard: () => void;
}

/** The primary "you're playing" dashboard — score/rank/countdown dominate,
 * one big primary CTA (Post) at a time, per the game-grade UI bar (not a
 * grid of equal-weight stat tiles). */
export function EventGameHomeView({ game, onViewLeaderboard }: EventGameHomeViewProps) {
  const standing = useMyEventGameStanding(game.id, { live: true });
  const [postOpen, setPostOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const score = standing.data?.score ?? 0;
  const rank = standing.data?.rank ?? 0;
  const postsUsed = standing.data?.post_count ?? 0;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 120% 55% at 50% 0%, hsl(var(--card)) 0%, hsl(var(--category-7) / 0.15) 30%, hsl(var(--category-7) / 0.3) 65%, hsl(var(--category-7) / 0.45) 100%)',
      }}
    >
      {/* Decorative corner glow + footer wave — purely cosmetic */}
      <div className="pointer-events-none absolute -top-10 -start-10 w-64 h-64 rounded-full bg-card/25 blur-2xl" />
      <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-20 text-primary-foreground/40" />

      <div className="relative flex flex-col items-center px-6 py-10 gap-6 max-w-md w-full mx-auto">
        <div className="w-20 h-20 rounded-full bg-card/50 backdrop-blur flex items-center justify-center ring-4 ring-border/40 shadow-lg">
          <Trophy className="w-9 h-9 text-category-7" />
        </div>

        <div className="text-lg font-extrabold tracking-wide text-category-7 uppercase text-center">{game.name}</div>

        <EventGameCountdown endsAt={game.ends_at} className="text-center" />

        <div className="grid grid-cols-2 gap-4 w-full text-center">
          <div className="relative overflow-hidden rounded-2xl bg-card shadow-[0_8px_24px_rgba(31,143,199,0.25)] p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.score')}</div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-category-7/70 to-category-7 bg-clip-text text-transparent">{score}</div>
            <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-6 text-category-7/15" />
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-card shadow-[0_8px_24px_rgba(31,143,199,0.25)] p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.rank')}</div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-category-7/70 to-category-7 bg-clip-text text-transparent">
              {rank === 1 ? '#1' : `#${rank || '—'}`}
            </div>
            <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-6 text-category-7/15" />
          </div>
        </div>

        <Button
          size="lg"
          className="w-full text-lg h-14 rounded-full bg-gradient-to-r from-category-7/70 to-category-7 hover:from-category-7/45 hover:to-category-7/85 shadow-[0_10px_28px_rgba(31,143,199,0.45)] hover:shadow-[0_12px_32px_rgba(31,143,199,0.55)] transition-all duration-300 border-0 flex items-center justify-center gap-2"
          onClick={() => setPostOpen(true)}
        >
          {t('eventGame.home.postCta')}
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="text-xs text-muted-foreground -mt-4">
          {t('eventGame.home.postsUsed', { used: postsUsed, max: game.max_posts_per_user })}
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1 rounded-full bg-card/70 backdrop-blur border-border text-category-7 hover:bg-card hover:text-category-7 flex items-center justify-center gap-1.5"
            onClick={onViewLeaderboard}
          >
            <Trophy className="w-4 h-4" />
            {t('eventGame.home.viewLeaderboard')}
          </Button>
          <Button
            variant="ghost"
            className="text-category-7 hover:bg-card/50 hover:text-category-7 flex items-center gap-1.5"
            onClick={() => setRulesOpen(true)}
          >
            <Info className="w-4 h-4" />
            {t('eventGame.home.rulesLink')}
          </Button>
        </div>

        <EventGamePostCTA game={game} open={postOpen} onOpenChange={setPostOpen} />
        <EventGameRulesSheet game={game} open={rulesOpen} onOpenChange={setRulesOpen} />
      </div>
    </div>
  );
}
