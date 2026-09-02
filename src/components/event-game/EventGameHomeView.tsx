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
    <div className="flex flex-col items-center px-6 py-8 gap-6 max-w-md mx-auto">
      <div className="text-sm font-semibold tracking-wide text-primary">{game.name}</div>

      <EventGameCountdown endsAt={game.ends_at} className="text-center" />

      <div className="grid grid-cols-2 gap-4 w-full text-center">
        <div className="rounded-2xl bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.score')}</div>
          <div className="text-4xl font-extrabold">{score}</div>
        </div>
        <div className="rounded-2xl bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('eventGame.home.rank')}</div>
          <div className="text-4xl font-extrabold">
            {rank === 1 ? '#1' : `#${rank || '—'}`}
          </div>
        </div>
      </div>

      <Button size="lg" className="w-full text-lg h-14" onClick={() => setPostOpen(true)}>
        {t('eventGame.home.postCta')}
      </Button>
      <div className="text-xs text-muted-foreground -mt-4">
        {t('eventGame.home.postsUsed', { used: postsUsed, max: game.max_posts_per_user })}
      </div>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1" onClick={onViewLeaderboard}>
          {t('eventGame.home.viewLeaderboard')}
        </Button>
        <Button variant="ghost" onClick={() => setRulesOpen(true)}>
          {t('eventGame.home.rulesLink')}
        </Button>
      </div>

      <EventGamePostCTA game={game} open={postOpen} onOpenChange={setPostOpen} />
      <EventGameRulesSheet game={game} open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
  );
}
