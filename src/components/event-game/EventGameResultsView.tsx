import { Trophy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { useEventGameLeaderboard, useMyEventGameStanding, useNativeShareResult } from '@/hooks/useEventGame';
import type { EventGame } from '@/hooks/useEventGame';
import { DecorativeWave } from '@/components/event-game/DecorativeWave';

interface EventGameResultsViewProps {
  game: EventGame;
}

/** Final, frozen result — same get_event_game_leaderboard RPC as the live
 * view (one implementation of the ranking rule, not two that could drift),
 * read once the event has genuinely ended (ends_at has passed). */
export function EventGameResultsView({ game }: EventGameResultsViewProps) {
  const { user } = useAuth();
  const leaderboard = useEventGameLeaderboard(game.id, { live: false, limit: 10 });
  const standing = useMyEventGameStanding(game.id, { live: false });
  const { share, isAvailable } = useNativeShareResult(game, standing.data?.rank, standing.data?.score);

  const winner = leaderboard.data?.[0];
  const myRow = leaderboard.data?.find((r) => r.user_id === user?.id);
  const gapToTop5 =
    !myRow && standing.data && leaderboard.data && leaderboard.data.length >= 5
      ? leaderboard.data[4].score - standing.data.score
      : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 120% 55% at 50% 0%, hsl(var(--card)) 0%, hsl(var(--category-7) / 0.15) 30%, hsl(var(--category-7) / 0.3) 65%, hsl(var(--category-7) / 0.45) 100%)',
      }}
    >
      <div className="pointer-events-none absolute -top-10 -start-10 w-64 h-64 rounded-full bg-card/25 blur-2xl" />
      <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-20 text-primary-foreground/40" />

      <div className="relative flex flex-col items-center px-6 py-10 gap-4 max-w-md w-full mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-card/50 backdrop-blur flex items-center justify-center ring-4 ring-border/40 shadow-[0_0_30px_rgba(31,143,199,0.5)]">
          <Trophy className="w-9 h-9 text-category-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('eventGame.results.winnerTitle')}</h1>

        {winner && (
          <div className="relative overflow-hidden rounded-2xl bg-card shadow-[0_8px_24px_rgba(31,143,199,0.25)] p-6 w-full">
            <div className="text-xl font-bold text-foreground">{t('eventGame.results.winnerCrown', { name: winner.display_name ?? '—' })}</div>
            <div className="text-3xl font-extrabold mt-1 bg-gradient-to-r from-category-7/70 to-category-7 bg-clip-text text-transparent">
              {t('eventGame.results.winnerPoints', { points: winner.score })}
            </div>
            <DecorativeWave className="pointer-events-none absolute bottom-0 start-0 w-full h-6 text-category-7/15" />
          </div>
        )}
        {game.winner_reward_text && (
          <div className="text-lg text-foreground">{t('eventGame.results.reward', { reward: game.winner_reward_text })}</div>
        )}
        {game.winner_reward_description && (
          <p className="text-sm text-muted-foreground">{game.winner_reward_description}</p>
        )}

        <div className="w-full rounded-2xl bg-card/80 backdrop-blur shadow-[0_4px_16px_rgba(31,143,199,0.15)] px-5 py-5 mt-2">
          <h2 className="text-lg font-bold text-foreground">{t('eventGame.results.yourResultTitle')}</h2>
          <div className="text-4xl font-extrabold mt-2 bg-gradient-to-r from-category-7/70 to-category-7 bg-clip-text text-transparent">
            {t('eventGame.results.yourRank', { rank: standing.data?.rank ?? '—' })}
          </div>
          <div className="text-xl font-semibold text-foreground">
            {t('eventGame.results.yourPoints', { points: standing.data?.score ?? 0 })}
          </div>
          <div className="flex flex-col gap-1 mt-3 text-sm text-muted-foreground">
            <div>{t('eventGame.results.postCount', { count: standing.data?.post_count ?? 0 })}</div>
            <div>{t('eventGame.results.likesCount', { count: standing.data?.breakdown?.like_received ?? 0 })}</div>
          </div>
          {gapToTop5 !== null && gapToTop5 > 0 && (
            <p className="mt-3 text-sm font-medium text-category-7">
              {t('eventGame.results.gap', { points: gapToTop5, n: 5 })}
            </p>
          )}
        </div>

        {isAvailable && (
          <Button
            size="lg"
            className="w-full mt-2 rounded-full bg-gradient-to-r from-category-7/70 to-category-7 hover:from-category-7/45 hover:to-category-7/85 shadow-[0_10px_28px_rgba(31,143,199,0.45)] hover:shadow-[0_12px_32px_rgba(31,143,199,0.55)] transition-all duration-300 border-0 flex items-center justify-center gap-2"
            onClick={share}
          >
            <Share2 className="w-5 h-5" />
            {t('eventGame.results.share')}
          </Button>
        )}
      </div>
    </div>
  );
}
