import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { useEventGameLeaderboard, useMyEventGameStanding, useNativeShareResult } from '@/hooks/useEventGame';
import type { EventGame } from '@/hooks/useEventGame';

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
    <div className="flex flex-col items-center px-6 py-8 gap-6 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-extrabold">{t('eventGame.results.winnerTitle')}</h1>
      {winner && (
        <div className="rounded-2xl bg-primary/5 p-6 w-full">
          <div className="text-xl font-bold">{t('eventGame.results.winnerCrown', { name: winner.display_name ?? '—' })}</div>
          <div className="text-3xl font-extrabold mt-1">{t('eventGame.results.winnerPoints', { points: winner.score })}</div>
        </div>
      )}
      {game.winner_reward_text && (
        <div className="text-lg">{t('eventGame.results.reward', { reward: game.winner_reward_text })}</div>
      )}
      {game.winner_reward_description && (
        <p className="text-sm text-muted-foreground">{game.winner_reward_description}</p>
      )}

      <div className="w-full border-t pt-6 mt-2">
        <h2 className="text-lg font-bold">{t('eventGame.results.yourResultTitle')}</h2>
        <div className="text-4xl font-extrabold mt-2">
          {t('eventGame.results.yourRank', { rank: standing.data?.rank ?? '—' })}
        </div>
        <div className="text-xl font-semibold">
          {t('eventGame.results.yourPoints', { points: standing.data?.score ?? 0 })}
        </div>
        <div className="flex flex-col gap-1 mt-3 text-sm text-muted-foreground">
          <div>{t('eventGame.results.postCount', { count: standing.data?.post_count ?? 0 })}</div>
          <div>{t('eventGame.results.likesCount', { count: standing.data?.breakdown?.like_received ?? 0 })}</div>
        </div>
        {gapToTop5 !== null && gapToTop5 > 0 && (
          <p className="mt-3 text-sm font-medium text-primary">
            {t('eventGame.results.gap', { points: gapToTop5, n: 5 })}
          </p>
        )}
      </div>

      {isAvailable && (
        <Button size="lg" className="w-full" onClick={share}>
          {t('eventGame.results.share')}
        </Button>
      )}
    </div>
  );
}
