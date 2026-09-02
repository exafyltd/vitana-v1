import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { useMyEventGameStanding } from '@/hooks/useEventGame';
import type { EventGame } from '@/hooks/useEventGame';
import { EventGameCountdown } from '@/components/event-game/EventGameCountdown';
import { EventGamePostCTA } from '@/components/event-game/EventGamePostCTA';
import { EventGameRulesSheet } from '@/components/event-game/EventGameRulesSheet';

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
    <div className="bg-gradient-to-b from-[#FFF5F8] via-[#FFF0F6] to-white pb-10">
      <div className="flex flex-col items-center px-6 py-10 gap-6 max-w-md mx-auto">
        <div className="text-sm font-bold tracking-wide text-[#FF4FA0] uppercase">{game.name}</div>

        <EventGameCountdown endsAt={game.ends_at} className="text-center" />

        <div className="grid grid-cols-2 gap-4 w-full text-center">
          <div className="rounded-2xl bg-white shadow-[0_4px_20px_rgba(255,79,160,0.12)] p-5 border border-[#FFD9E8]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.score')}</div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] bg-clip-text text-transparent">{score}</div>
          </div>
          <div className="rounded-2xl bg-white shadow-[0_4px_20px_rgba(255,79,160,0.12)] p-5 border border-[#FFD9E8]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.rank')}</div>
            <div className="text-5xl font-extrabold bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] bg-clip-text text-transparent">
              {rank === 1 ? '#1' : `#${rank || '—'}`}
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full text-lg h-14 rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 border-0"
          onClick={() => setPostOpen(true)}
        >
          {t('eventGame.home.postCta')}
        </Button>
        <div className="text-xs text-muted-foreground -mt-4">
          {t('eventGame.home.postsUsed', { used: postsUsed, max: game.max_posts_per_user })}
        </div>

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1 rounded-full border-[#FFD9E8] text-[#FF4FA0] hover:bg-[#FFF0F6] hover:text-[#FF4FA0]" onClick={onViewLeaderboard}>
            {t('eventGame.home.viewLeaderboard')}
          </Button>
          <Button variant="ghost" className="text-[#FF4FA0] hover:bg-[#FFF0F6] hover:text-[#FF4FA0]" onClick={() => setRulesOpen(true)}>
            {t('eventGame.home.rulesLink')}
          </Button>
        </div>

        <EventGamePostCTA game={game} open={postOpen} onOpenChange={setPostOpen} />
        <EventGameRulesSheet game={game} open={rulesOpen} onOpenChange={setRulesOpen} />
      </div>
    </div>
  );
}
